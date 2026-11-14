// Возврат разрешён только на внутреннюю страницу, без URL внешних сайтов.
export function authReturnPath(state: unknown): string {
 const from = (state as { from?: { pathname?: unknown; search?: unknown; hash?: unknown } } | null)?.from;
 const path = from?.pathname;
 if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /^\/(login|register)(\/|$)/.test(path)) return "/profile";
 const search = typeof from?.search === "string" && from.search.startsWith("?") ? from.search : "";
 const hash = typeof from?.hash === "string" && from.hash.startsWith("#") ? from.hash : "";
 return path + search + hash;
}
