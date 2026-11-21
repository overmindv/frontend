import { uploadSingleMedia } from "./media";
import { mediaStorageOrigins, mediaStorageURL } from "./mediaStorage";
import { isMaterialID, type MaterialAttachment } from "./materials";
import type { CreateMediaUploadInput } from "./types";

const fileTypes = {
  "image/jpeg": ["image", "content_image"],
  "image/png": ["image", "content_image"],
  "image/webp": ["image", "content_image"],
  "application/pdf": ["pdf", "attachment"],
  "application/zip": ["archive", "archive"],
  "application/gzip": ["archive", "archive"],
  "application/x-tar": ["archive", "archive"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["attachment", "attachment"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["attachment", "attachment"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["attachment", "attachment"],
} as const satisfies Record<string, readonly [MaterialAttachment["kind"], CreateMediaUploadInput["purpose"]]>;

export const materialFileAccept = Object.keys(fileTypes).join(",");
export const maxMaterialAttachments = 32;

export function attachmentFileError(file: File): string | null {
  if (!(Object.hasOwn(fileTypes, file.type))) return "Этот тип файла не поддерживается.";
  if (!file.size || file.size > 20 * 1024 * 1024) return "Размер файла должен быть от 1 байта до 20 МБ.";
  const name = file.name.trim();
  if (!name || new TextEncoder().encode(name).length > 256) return "Имя файла слишком длинное или пустое.";
  return null;
}

export async function uploadMaterialAttachment(file: File, signal: AbortSignal): Promise<Omit<MaterialAttachment, "position">> {
  if (attachmentFileError(file)) throw new Error("Недопустимый файл.");
  const [kind, purpose] = fileTypes[file.type as keyof typeof fileTypes];
  const fileId = await uploadSingleMedia(file, {
    purpose,
    visibility: "private",
    signal: AbortSignal.any([signal, AbortSignal.timeout(120_000)]),
    resolveURL: (url) => mediaStorageURL(url, mediaStorageOrigins),
  });
  if (!isMaterialID(fileId)) throw new Error("Файл не зарегистрирован.");
  return { kind, fileId, title: file.name.trim() };
}
