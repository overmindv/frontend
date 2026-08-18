import { gql } from "@apollo/client";
import { apolloClient } from "./client";
import { SET_MY_AVATAR_MUTATION } from "./mutations";
import type { User } from "./types";

const CREATE_UPLOAD = gql`
  mutation CreateAvatarUpload($input: CreateMediaUploadInput!) {
    createMediaUpload(input: $input) { fileId mode url fields { name value } expiresAt }
  }
`;

const COMPLETE_UPLOAD = gql`
  mutation CompleteAvatarUpload($input: CompleteMediaUploadInput!) {
    completeMediaUpload(input: $input) { id status failureCode }
  }
`;

const MEDIA_STATUS = gql`
  query AvatarStatus($id: ID!) { mediaFile(id: $id) { id status failureCode } }
`;

interface MediaFileStatus { id: string; status: string; failureCode: string }

// uploadAvatar отправляет cropped WebP напрямую в object storage и привязывает готовый файл.
export async function uploadAvatar(blob: Blob, signal?: AbortSignal): Promise<User> {
  const checksum = await sha256(blob);
  const created = await apolloClient.mutate<{
    createMediaUpload: { fileId: string; mode: string; url: string; fields: Array<{ name: string; value: string }> };
  }>({
    mutation: CREATE_UPLOAD,
    variables: { input: { originalName: "avatar.webp", contentType: "image/webp", sizeBytes: blob.size, checksumSha256: checksum, purpose: "avatar", visibility: "public" } },
  });
  const target = created.data?.createMediaUpload;
  if (!target || target.mode !== "single") throw new Error("Не удалось создать загрузку аватара.");
  const form = new FormData();
  target.fields.forEach((field) => form.append(field.name, field.value));
  if (!target.fields.some((field) => field.name.toLowerCase() === "content-type")) form.append("Content-Type", "image/webp");
  form.append("file", blob, "avatar.webp");
  const uploaded = await fetch(target.url, { method: "POST", body: form, signal });
  if (!uploaded.ok) throw new Error("Object storage отклонил загрузку аватара.");
  await apolloClient.mutate({ mutation: COMPLETE_UPLOAD, variables: { input: { fileId: target.fileId, parts: [] } } });
  await waitUntilReady(target.fileId, signal);
  const linked = await apolloClient.mutate<{ setMyAvatar: User }>({ mutation: SET_MY_AVATAR_MUTATION, variables: { fileId: target.fileId } });
  if (!linked.data?.setMyAvatar) throw new Error("Не удалось привязать аватар.");

  return linked.data.setMyAvatar;
}

async function waitUntilReady(fileId: string, signal?: AbortSignal) {
  const deadline = Date.now() + 60_000;
  let delay = 1_000;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException("Загрузка отменена", "AbortError");
    const response = await apolloClient.query<{ mediaFile: MediaFileStatus }>({ query: MEDIA_STATUS, variables: { id: fileId }, fetchPolicy: "network-only" });
    if (response.data.mediaFile.status === "ready") return;
    if (response.data.mediaFile.status === "rejected") throw new Error(response.data.mediaFile.failureCode || "Файл отклонён.");
    await abortableDelay(delay, signal);
    delay = Math.min(2_000, delay + 500);
  }
  throw new Error("Обработка аватара заняла слишком много времени.");
}

async function abortableDelay(delay: number, signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Загрузка отменена", "AbortError");

  await new Promise<void>((resolve, reject) => {
    const aborted = () => {
      window.clearTimeout(timeout);
      reject(new DOMException("Загрузка отменена", "AbortError"));
    };
    const timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", aborted);
      resolve();
    }, delay);
    signal?.addEventListener("abort", aborted, { once: true });
  });
}

async function sha256(blob: Blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
