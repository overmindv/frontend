export { mediaStorageURL as materialDownloadURL, mediaStorageOrigins as materialDownloadOrigins } from "../../api/mediaStorage";

const internalPath = /^\/(?:materials|topics|tasks)(?:\/[a-z0-9-]+)?\/?$/i;
const forbidden = /[\\\s]/;

export function materialMarkdownLink(value: string): string | undefined {
  if (!value || forbidden.test(value)) return;
  if (value.startsWith("#")) return value;
  if (value.startsWith("/") && !value.startsWith("//")) {
    const url = new URL(value, "https://overmind.invalid");
    if (internalPath.test(url.pathname)) return url.pathname + url.search + url.hash;
    return;
  }
  if (!value.startsWith("https://")) return;
  try {
    const url = new URL(value);
    if (!url.username && !url.password) return url.href;
  } catch {
    return;
  }
}
