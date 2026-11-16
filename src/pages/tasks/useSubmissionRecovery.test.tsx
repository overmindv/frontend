import { act, renderHook } from "@testing-library/react";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import type { ITCodeSubmission } from "../../api/tasks";
import { useSubmissionRecovery, recoveryStorageKey, submissionRetryKey } from "./useSubmissionRecovery";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@apollo/client", async (importOriginal) => { const original = await importOriginal<typeof import("@apollo/client")>(); const client = { query }; return { ...original, useApolloClient: () => client }; });
const scope = { userId: "user", taskId: "task", taskVersionId: "version" };
const result = { id: "submission", userId: "user", taskId: "task", taskVersionId: "version", runMode: "graded", status: "completed", verdict: "accepted" } as ITCodeSubmission;
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-16T10:00:00Z")); query.mockReset(); });
afterEach(() => { vi.useRealTimers(); });
function seed() {
  localStorage.setItem(recoveryStorageKey(scope), JSON.stringify({ id: "submission", runMode: "graded", startedAt: Date.now() }));
}
test("reload restores ID, terminal clears storage and polling", async () => {
  seed(); query.mockResolvedValue({ data: { itCodeSubmission: result } });
  const view = renderHook(() => useSubmissionRecovery(scope));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(view.result.current.submission?.verdict).toBe("accepted");
  expect(localStorage.getItem(recoveryStorageKey(scope))).toBeNull();
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(query).toHaveBeenCalledTimes(1);
});
test("outage backs off and deadline preserves pending ID", async () => {
  seed(); query.mockRejectedValue(new Error("private technical error"));
  const view = renderHook(() => useSubmissionRecovery(scope));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(view.result.current.phase).toBe("unavailable");
  await act(async () => { await vi.advanceTimersByTimeAsync(1499); });
  expect(query).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(query).toHaveBeenCalledTimes(2);
  await act(async () => { await vi.advanceTimersByTimeAsync(300000); });
  expect(view.result.current.phase).toBe("paused");
  const count = query.mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(300000); });
  expect(query).toHaveBeenCalledTimes(count);
  expect(localStorage.getItem(recoveryStorageKey(scope))).not.toBeNull();
});
test("late terminal after unmount cannot clear pending receipt", async () => {
  seed(); let resolve!: (value: unknown) => void;
  query.mockReturnValue(new Promise((done) => { resolve = done; }));
  const view = renderHook(() => useSubmissionRecovery(scope));
  view.unmount();
  await act(async () => { resolve({ data: { itCodeSubmission: result } }); });
  expect(localStorage.getItem(recoveryStorageKey(scope))).not.toBeNull();
  expect(query).toHaveBeenCalledTimes(1);
});
test("another user cannot restore this receipt", async () => {
  seed();
  const view = renderHook(() => useSubmissionRecovery({ ...scope, userId: "other" }));
  expect(view.result.current.pending).toBe(false);
  expect(query).not.toHaveBeenCalled();
});

test("manual retry recovers a late terminal after deadline", async () => {
  seed(); query.mockRejectedValue(new Error("offline"));
  const view = renderHook(() => useSubmissionRecovery(scope));
  await act(async () => { await vi.advanceTimersByTimeAsync(300001); });
  expect(view.result.current.phase).toBe("paused");
  query.mockResolvedValue({ data: { itCodeSubmission: result } });
  await act(async () => { view.result.current.retry(); });
  expect(view.result.current.submission?.verdict).toBe("accepted");
  expect(view.result.current.pending).toBe(false);
});
test("wrong-owner result is never displayed or removed", async () => {
  seed(); query.mockResolvedValue({ data: { itCodeSubmission: { ...result, userId: "other" } } });
  const view = renderHook(() => useSubmissionRecovery(scope));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(view.result.current.submission).toBeNull();
  expect(view.result.current.phase).toBe("unavailable");
  expect(localStorage.getItem(recoveryStorageKey(scope))).not.toBeNull();
});
test("pending request times out and unmount aborts further polling", async () => {
  seed(); query.mockReturnValue(new Promise(() => undefined));
  const view = renderHook(() => useSubmissionRecovery(scope));
  const signal = query.mock.calls[0][0].context.fetchOptions.signal as AbortSignal;
  await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
  expect(signal.aborted).toBe(true);
  expect(view.result.current.phase).toBe("unavailable");
  view.unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(query).toHaveBeenCalledTimes(1);
});
test("lost response reuses payload key after reload without saving source", async () => {
  const source = "print('private-source-marker')";
  const first = await submissionRetryKey(scope, "graded", "python", source, "11111111-1111-4111-8111-111111111111");
  const reloaded = await submissionRetryKey(scope, "graded", "python", source, "22222222-2222-4222-8222-222222222222");
  expect(reloaded.key).toBe(first.key);
  expect(JSON.stringify(localStorage)).not.toContain(source);
  const other = await submissionRetryKey({ ...scope, userId: "other" }, "graded", "python", source, "33333333-3333-4333-8333-333333333333");
  expect(other.key).not.toBe(first.key);
  first.clear();
  expect((await submissionRetryKey(scope, "graded", "python", source, "44444444-4444-4444-8444-444444444444")).key).not.toBe(first.key);
});
