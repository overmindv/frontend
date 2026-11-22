import { apolloClient } from "./client";
import {
  COMPLETE_MEDIA_UPLOAD_MUTATION,
  CREATE_MEDIA_UPLOAD_MUTATION,
  SET_MY_AVATAR_MUTATION,
} from "./mutations";
import { MEDIA_FILE_QUERY } from "./queries";
import type {
  CompleteMediaUploadInput,
  CreateMediaUploadInput,
  MediaUpload,
  User,
} from "./types";

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}

// Media проверяет файлы асинхронно. Привязка доступна только после ready.
async function pollUntilReady(fileId: string, signal?: AbortSignal, timeoutMs = 60_000): Promise<void> {
  const started = Date.now();
  for (;;) {
    signal?.throwIfAborted();
    const { data } = await apolloClient.query({
      query: MEDIA_FILE_QUERY,
      variables: { id: fileId },
      fetchPolicy: "no-cache",
      context: { fetchOptions: { signal }, queryDeduplication: false },
    });
    const status = data.mediaFile?.status;
    if (status === "ready") return;
    if (status === "rejected" || status === "deleted") {
      throw new Error(`Файл отклонён при проверке (${status}).`);
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error("Файл слишком долго обрабатывается, попробуйте ещё раз.");
    }
    await delay(1_000, signal);
  }
}

// Передаёт байты напрямую в object storage по presigned POST-форме, минуя gateway.
async function postToObjectStorage(upload: MediaUpload, url: string, file: File, signal?: AbortSignal): Promise<void> {
  const form = new FormData();
  for (const field of upload.fields) {
    form.append(field.name, field.value);
  }
  form.append("file", file);

  const response = await fetch(url, {
    method: "POST", body: form, signal, credentials: "omit", redirect: "error", referrerPolicy: "no-referrer",
  });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить файл (HTTP ${response.status}).`);
  }
}

export interface UploadAvatarResult {
  fileId: string;
  user: User;
}

type UploadOptions = Pick<CreateMediaUploadInput, "purpose" | "visibility"> & {
  signal?: AbortSignal;
  resolveURL?: (value: string) => string | undefined;
};

export async function uploadSingleMedia(file: File, options: UploadOptions): Promise<string> {
  const { purpose, visibility, signal, resolveURL } = options;
  signal?.throwIfAborted();
  const buffer = await file.arrayBuffer();
  const checksumSha256 = await sha256Hex(buffer);
  signal?.throwIfAborted();

  const createInput: CreateMediaUploadInput = {
    originalName: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    checksumSha256,
    purpose,
    visibility,
  };
  const createResult = await apolloClient.mutate({
    mutation: CREATE_MEDIA_UPLOAD_MUTATION,
    variables: { input: createInput },
    fetchPolicy: "no-cache",
    context: { fetchOptions: { signal } },
  });
  const upload = createResult.data?.createMediaUpload;
  if (!upload) throw new Error("Не удалось создать сессию загрузки.");
  const url = resolveURL ? resolveURL(upload.url) : upload.url;
  if (upload.mode !== "single" || !url || !upload.fileId || !upload.fields.length) {
    throw new Error("Сессия загрузки недоступна.");
  }
  await postToObjectStorage(upload, url, file, signal);

  const completeInput: CompleteMediaUploadInput = { fileId: upload.fileId, parts: [] };
  const completeResult = await apolloClient.mutate({
    mutation: COMPLETE_MEDIA_UPLOAD_MUTATION,
    variables: { input: completeInput },
    fetchPolicy: "no-cache",
    context: { fetchOptions: { signal } },
  });
  if (!completeResult.data?.completeMediaUpload) {
    throw new Error("Не удалось завершить загрузку.");
  }

  await pollUntilReady(upload.fileId, signal);
  return upload.fileId;
}

// Загружает аватар и назначает его текущему пользователю.
export async function uploadAvatar(file: File): Promise<UploadAvatarResult> {
  const fileId = await uploadSingleMedia(file, { purpose: "avatar", visibility: "public" });
  const avatarResult = await apolloClient.mutate({
    mutation: SET_MY_AVATAR_MUTATION,
    variables: { fileId },
  });
  const user = avatarResult.data?.setMyAvatar;
  if (!user) throw new Error("Не удалось сохранить аватар.");

  return { fileId, user };
}
