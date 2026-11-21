export const maxPhotosPerGroup = 10;
export const maxInlinePhotoReferences = 32;

const photoUUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const zeroUUID = "00000000-0000-0000-0000-000000000000";

export function isPhotoFence(source: string, offset: number | undefined): boolean {
  if (offset === undefined) return false;
  const end = source.indexOf("\n", offset);
  const header = source.slice(offset, end === -1 ? source.length : end).replace(/[ \t\r]+$/, "");
  return /^(?:`{3,}|~{3,})[ \t]*ovm-photos(?: |$)/.test(header);
}

export function parsePhotoGroup(body: string): string[] | null {
  const lines = body.replace(/\r?\n$/, "").split("\n", maxPhotosPerGroup + 1);
  if (lines.length > maxPhotosPerGroup) return null;
  const ids = lines.map((line) => line.replace(/^[ \t\r]+|[ \t\r]+$/g, ""));
  if (ids.some((id) => !photoUUID.test(id) || id === zeroUUID) || new Set(ids).size !== ids.length) return null;
  return ids;
}
