import { useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";

export function useDraftGuard(active: boolean) {
  const blocker = useBlocker(active);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!active) return;
    const preventExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", preventExit);
    return () => window.removeEventListener("beforeunload", preventExit);
  }, [active]);

  useEffect(() => {
    const element = dialog.current;
    if (blocker.state !== "blocked" || !element) return;
    element.showModal();
    return () => { if (element.open) element.close(); };
  }, [blocker.state]);

  return blocker.state === "blocked" ?
    <dialog ref={dialog} className="editor-leave" aria-labelledby="draft-leave-title" onCancel={(event) => {
      event.preventDefault();
      blocker.reset();
    }}>
      <h2 id="draft-leave-title">Уйти без сохранения?</h2>
      <div>
        <button type="button" className="button button--primary" autoFocus onClick={blocker.reset}>Остаться</button>
        <button type="button" className="button button--ghost" onClick={blocker.proceed}>Уйти</button>
      </div>
    </dialog> : null;
}
