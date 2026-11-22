// Web Locks разделяются вкладками одного origin, включая разные реплики gateway.
// Секреты остаются в httpOnly cookie; проверка срока выполняется сервером без зависимости от часов браузера.
export interface SessionLocks {
  request<T>(name: string, run: () => Promise<T>): Promise<T>;
}

const ensureQuery = "mutation EnsureBrowserSession { refreshSession }";
const lockName = "overmindv-browser-session";

type OperationBody = {
  operationName?: string;
  variables?: { input?: Record<string, unknown> };
};

function operationBody(body: RequestInit["body"]): OperationBody | undefined {
  const value = body instanceof FormData ? body.get("operations") : body;
  if (typeof value !== "string") return undefined;
  try { return JSON.parse(value) as OperationBody; } catch { return undefined; }
}

export function createSessionFetch(fetcher: typeof fetch, locks?: SessionLocks): typeof fetch {
  let pending: Promise<void> | undefined;

  async function ensure(input: RequestInfo | URL) {
    if (!pending) {
      pending = locks!.request(lockName, async () => {
        const response = await fetcher(input, {
          method: "POST", credentials: "include", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName: "EnsureBrowserSession", query: ensureQuery }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error("Session unavailable");
        const result = await response.json() as { data?: { refreshSession: string | null }; errors?: unknown[] };
        if (result.errors?.length || !result.data) throw new Error("Session unavailable");
      }).finally(() => { pending = undefined; });
    }
    await pending;
  }

  return async (input, init) => {
    if (!locks) return fetcher(input, init);
    const body = operationBody(init?.body);
    const name = body?.operationName;
    if (name === "Login" || name === "Register" || name === "Logout") {
      return locks.request(lockName, async () => {
        let request = init;
        if (name !== "Logout" && body?.variables?.input) {
          request = { ...init, body: JSON.stringify({ ...body, variables: { ...body.variables, input: { ...body.variables.input, refreshSession: true } } }) };
        }
        return fetcher(input, request);
      });
    }
    await ensure(input);
    // Не повторяем исходный запрос: mutation могла уже произвести изменения.
    return fetcher(input, init);
  };
}
