import { useState } from "react";
import { Share2 } from "lucide-react";

export function ShareButton({ path, title, label }: { path: string; title: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function share() {
    const url = new URL(path, window.location.origin).href;
    setState("idle");
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("error");
    }
  }

  return <span className="share-control"><button className="button button--ghost" type="button" onClick={() => { void share(); }}><Share2 size={15} aria-hidden="true" /> {label}</button>
    {state !== "idle" && <small role="status">{state === "copied" ? "Ссылка скопирована" : "Не удалось скопировать ссылку"}</small>}
  </span>;
}
