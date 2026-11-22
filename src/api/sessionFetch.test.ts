import { describe, expect, it, vi } from "vitest";
import { createSessionFetch } from "./sessionFetch";

function locks() {
  let tail = Promise.resolve();
  return { request: <T,>(_: string, run: () => Promise<T>) => {
    const result = tail.then(run);
    tail = result.then(() => undefined, () => undefined);
    return result;
  } };
}
const operation = (name = "Solve") => ({ method: "POST", body: JSON.stringify({ operationName: name, query: "mutation Solve { solve }", variables: { input: {} } }) });
const json = (data: unknown) => new Response(JSON.stringify({ data }), { headers: { "Content-Type": "application/json" } });

describe("browser session fetch", () => {
  it("rotates once across tabs before sending business operations, never replays them", async () => {
    const shared = locks(); let valid = false; let rotations = 0;
    const fetcher = vi.fn(async (_: RequestInfo | URL, init?: RequestInit) => {
      const req = JSON.parse(String(init?.body));
      if (req.operationName === "EnsureBrowserSession") {
        if (!valid) { rotations++; valid = true; }
        return json({ refreshSession: new Date(Date.now() + 3600000).toISOString() });
      }
      return json({ solve: true });
    });
    const tab1 = createSessionFetch(fetcher, shared);
    const tab2 = createSessionFetch(fetcher, shared);
    await Promise.all([tab1("/graphql", operation()), tab1("/graphql", operation()), tab2("/graphql", operation())]);
    expect(rotations).toBe(1);
    expect(fetcher.mock.calls.filter(([, init]) => JSON.parse(String(init?.body)).operationName === "Solve")).toHaveLength(3);
  });
  it("keeps legacy access-only login without cross-tab locking", async () => {
    const fetcher = vi.fn(async () => json({ login: {} }));
    await createSessionFetch(fetcher, undefined)("/graphql", operation("Login"));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("opts login in and serializes logout with refresh", async () => {
    const fetcher = vi.fn(async (_: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body));
      if (request.operationName === "Login") expect(request.variables.input.refreshSession).toBe(true);
      return json({ login: {}, logout: true });
    });
    const wrapped = createSessionFetch(fetcher, locks());
    await wrapped("/graphql", operation("Login"));
    await wrapped("/graphql", operation("Logout"));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not send the business mutation or log out on transient refresh failure", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ errors: [{ extensions: { code: "SERVICE_UNAVAILABLE" } }] })));
    await expect(createSessionFetch(fetcher, locks())("/graphql", operation())).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

it("does not skip preflight after the browser clock moves backwards", async () => {
  const clock=vi.spyOn(Date,"now").mockReturnValue(1000000000000);
  const fetcher=vi.fn(async (_:RequestInfo|URL,init?:RequestInit)=>JSON.parse(String(init?.body)).operationName==="EnsureBrowserSession"?json({refreshSession:new Date(1000003600000).toISOString()}):json({solve:true}));
  const wrapped=createSessionFetch(fetcher,locks());
  await wrapped("/graphql",operation());
  clock.mockReturnValue(999999000000);
  await wrapped("/graphql",operation());
  expect(fetcher.mock.calls.filter(([,init])=>JSON.parse(String(init?.body)).operationName==="EnsureBrowserSession")).toHaveLength(2);
});
