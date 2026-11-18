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

export function materialDownloadURL(value: string, allowedOrigins: readonly string[]): string | undefined {
  if (forbidden.test(value)) return;
  try {
    const url = new URL(value);
    const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) return;
    if (url.username || url.password || url.hash || !allowedOrigins.includes(url.origin)) return;
    return url.href;
  } catch {
    return;
  }
}

const localDownloadOrigins = "http://localhost:9000,http://127.0.0.1:9000";
export const materialDownloadOrigins = (
  import.meta.env.VITE_MEDIA_DOWNLOAD_ORIGINS ?? (import.meta.env.DEV ? localDownloadOrigins : "")
).split(",").map((origin: string) => origin.trim()).filter(Boolean);
