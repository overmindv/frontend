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
  MediaFile,
  MediaUpload,
  User,
} from "./types";

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ожидает, пока файл пройдёт асинхронную обработку в Media (сканирование, WebP-варианты)
// и станет ready — иначе setMyAvatar получает 409 "файл не готов".
// Обработка занимает время, поэтому "quarantined"/"processing" — это нормальные промежуточные
// статусы, их опрашиваем дальше; терминальные отказы только rejected/deleted.
async function pollUntilReady(fileId: string, timeoutMs = 60_000): Promise<void> {
  const started = Date.now();
  for (;;) {
    const { data } = await apolloClient.query<{ mediaFile: MediaFile }>({
      query: MEDIA_FILE_QUERY,
      variables: { id: fileId },
      fetchPolicy: "network-only",
    });
    const status = data.mediaFile?.status;
    if (status === "ready") return;
    if (status === "rejected" || status === "deleted") {
      throw new Error(`Файл отклонён при проверке (${status}).`);
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error("Файл слишком долго обрабатывается, попробуйте ещё раз.");
    }
    await delay(1_000);
  }
}

// Передаёт байты напрямую в object storage по presigned POST-форме, минуя gateway.
async function postToObjectStorage(upload: MediaUpload, file: File): Promise<void> {
  const form = new FormData();
  for (const field of upload.fields) {
    form.append(field.name, field.value);
  }
  form.append("file", file);

  const response = await fetch(upload.url, { method: "POST", body: form });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить файл (HTTP ${response.status}).`);
  }
}

export interface UploadAvatarResult {
  fileId: string;
  user: User;
}

// Загружает аватар и назначает его текущему пользователю.
export async function uploadAvatar(file: File): Promise<UploadAvatarResult> {
  const buffer = await file.arrayBuffer();
  const checksumSha256 = await sha256Hex(buffer);

  const createInput: CreateMediaUploadInput = {
    originalName: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    checksumSha256,
    purpose: "avatar",
    visibility: "public",
  };
  const createResult = await apolloClient.mutate<{ createMediaUpload: MediaUpload }>({
    mutation: CREATE_MEDIA_UPLOAD_MUTATION,
    variables: { input: createInput },
  });
  const upload = createResult.data?.createMediaUpload;
  if (!upload) throw new Error("Не удалось создать сессию загрузки.");

  await postToObjectStorage(upload, file);

  const completeInput: CompleteMediaUploadInput = { fileId: upload.fileId, parts: [] };
  const completeResult = await apolloClient.mutate<{ completeMediaUpload: MediaFile }>({
    mutation: COMPLETE_MEDIA_UPLOAD_MUTATION,
    variables: { input: completeInput },
  });
  if (!completeResult.data?.completeMediaUpload) {
    throw new Error("Не удалось завершить загрузку.");
  }

  await pollUntilReady(upload.fileId);

  const avatarResult = await apolloClient.mutate<{ setMyAvatar: User }>({
    mutation: SET_MY_AVATAR_MUTATION,
    variables: { fileId: upload.fileId },
  });
  const user = avatarResult.data?.setMyAvatar;
  if (!user) throw new Error("Не удалось сохранить аватар.");

  return { fileId: upload.fileId, user };
}
