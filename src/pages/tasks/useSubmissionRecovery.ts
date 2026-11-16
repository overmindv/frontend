import { useApolloClient } from "@apollo/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { IT_CODE_SUBMISSION_QUERY, type ITCodeRunMode, type ITCodeSubmission } from "../../api/tasks";

interface Scope { userId: string | null; taskId: string; taskVersionId: string }
interface Receipt { id: string; runMode: ITCodeRunMode; startedAt: number }
type Phase = "idle" | "watching" | "unavailable" | "paused";
const deadlineMs = 5 * 60 * 1000;
const requestTimeoutMs = 10000;

export function recoveryStorageKey(scope: Scope) {
  return `overmindv:pending-code:${scope.userId}:${scope.taskId}:${scope.taskVersionId}`;
}
function readReceipt(key: string): Receipt | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null") as Receipt | null;
    return value && typeof value.id === "string" && value.id.length > 0 && value.id.length <= 128
      && (value.runMode === "graded" || value.runMode === "samples")
      && Number.isFinite(value.startedAt) ? value : null;
  } catch { return null; }
}
function writeReceipt(key: string, value: Receipt | null) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch { /* Заблокированное хранилище не прерывает текущую попытку. */ }
}

function clearReceipt(key: string, id: string) { if (readReceipt(key)?.id === id) writeReceipt(key, null); }

// Сохраняется только fingerprint исходника и ключ, никогда сам код или токен.
export async function submissionRetryKey(scope: Scope, mode: ITCodeRunMode, language: string, source: string | File, fallback: string) {
  if (!scope.userId) return { key: fallback, clear: () => undefined };
  const bytes = typeof source === "string" ? new TextEncoder().encode(source) : await new Promise<ArrayBuffer>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = () => reject(new Error("file read failed")); reader.readAsArrayBuffer(source); });
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (v) => v.toString(16).padStart(2, "0")).join("");
  const sourceKind = typeof source === "string" ? "editor" : `file:${encodeURIComponent(source.name)}`;
  const storageKey = `${recoveryStorageKey(scope)}:retry:${mode}:${language}:${sourceKind}:${hash}`;
  let key = fallback;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved && /^[0-9a-f-]{36}$/i.test(saved)) key = saved;
    localStorage.setItem(storageKey, key);
  } catch { /* Синхронный ключ в ref всё ещё защищает повтор в текущем окне. */ }
  return { key, clear: () => { try { localStorage.removeItem(storageKey); } catch { /* noop */ } } };
}

export function useSubmissionRecovery(scope: Scope) {
  const client = useApolloClient();
  const storageKey = recoveryStorageKey(scope);
  const [receipt, setReceipt] = useState<Receipt | null>(() => scope.userId ? readReceipt(storageKey) : null);
  const [submission, setSubmission] = useState<ITCodeSubmission | null>(null);
  const [phase, setPhase] = useState<Phase>(() => receipt ? "watching" : "idle");
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const track = useCallback((result: ITCodeSubmission) => {
    const next = result.status === "queued" ? { id: result.id, runMode: result.runMode, startedAt: Date.now() } : null;
    if (scope.userId) { if (next) writeReceipt(storageKey, next); else clearReceipt(storageKey, result.id); }
    if (!mounted.current) return;
    setSubmission(result);
    setReceipt(next);
    setPhase(next ? "watching" : "idle");
  }, [scope.userId, storageKey]);

  useEffect(() => {
    if (!receipt) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let requestTimer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let delay = 1500;
    const endsAt = Math.min(receipt.startedAt, Date.now()) + deadlineMs;
    const poll = async () => {
      if (cancelled) return;
      if (Date.now() >= endsAt) { setPhase("paused"); return; }
      controller = new AbortController();
      try {
        const timeout = new Promise<never>((_, reject) => {
          requestTimer = setTimeout(() => { controller?.abort(); reject(new Error("request timeout")); }, Math.min(requestTimeoutMs, endsAt - Date.now()));
        });
        const response = await Promise.race([
          client.query<{ itCodeSubmission: ITCodeSubmission | null }>({
            query: IT_CODE_SUBMISSION_QUERY, variables: { id: receipt.id }, fetchPolicy: "no-cache",
            context: { fetchOptions: { signal: controller.signal } },
          }), timeout,
        ]);
        if (cancelled) return;
        const result = response.data.itCodeSubmission;
        if (!result || result.id !== receipt.id || result.taskId !== scope.taskId || result.taskVersionId !== scope.taskVersionId
          || (scope.userId && result.userId !== scope.userId)) throw new Error("unavailable result");
        setSubmission(result);
        if (result.status === "completed") {
          if (scope.userId) clearReceipt(storageKey, result.id);
          setReceipt(null);
          setPhase("idle");
          return;
        }
        setPhase("watching");
      } catch {
        if (cancelled) return;
        setPhase("unavailable");
      } finally { clearTimeout(requestTimer); }
      if (!cancelled) {
        timer = setTimeout(() => { void poll(); }, Math.max(0, Math.min(delay, endsAt - Date.now())));
        delay = Math.min(15000, delay * 2);
      }
    };
    void poll();
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(requestTimer); controller?.abort(); };
  }, [client, receipt, scope.taskId, scope.taskVersionId, scope.userId, storageKey]);

  const retry = () => {
    if (!receipt) return;
    const next = { ...receipt, startedAt: Date.now() };
    if (scope.userId) writeReceipt(storageKey, next);
    setReceipt(next); setPhase("watching");
  };
  const clearResult = () => { if (!receipt) setSubmission(null); };
  return { submission, pending: receipt !== null, phase, track, retry, clearResult };
}
