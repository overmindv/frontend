export function mediaStorageURL(value: string, allowedOrigins: readonly string[]): string | undefined {
  if (/[\\\s]/.test(value)) return;
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

const localOrigins = "http://localhost:9000,http://127.0.0.1:9000";
export const mediaStorageOrigins: readonly string[] = (
  import.meta.env.VITE_MEDIA_DOWNLOAD_ORIGINS ?? (import.meta.env.DEV ? localOrigins : "")
).split(",").map((origin: string) => origin.trim()).filter(Boolean);
