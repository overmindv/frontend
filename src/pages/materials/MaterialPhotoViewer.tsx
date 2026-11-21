import { useApolloClient } from "@apollo/client";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { requestMaterialAttachment, type MaterialAttachment, type MaterialPublication } from "../../api/materials";
import { Spinner } from "../../components/common/Spinner";
import "./materialPhotoViewer.css";

type PhotoState = { status: "requesting" | "failed" } | { status: "loading" | "ready"; href: string };

export function MaterialPhotoFrame({ fileId, title, publication, onRetry }: {
  fileId: string; title: string; publication: MaterialPublication; onRetry: () => void;
}) {
  const client = useApolloClient();
  const { materialId, revisionId } = publication;
  const [state, setState] = useState<PhotoState>({ status: "requesting" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    async function load() {
      try {
        const link = await requestMaterialAttachment(client, { materialId, revisionId }, fileId, signal);
        if (!signal.aborted) setState(link ? { status: "loading", href: link.href } : { status: "failed" });
      } catch {
        if (!signal.aborted) setState({ status: "failed" });
      }
    }
    // StrictMode discards the first effect before this microtask.
    queueMicrotask(() => { if (!signal.aborted) void load(); });
    return () => controller.abort();
  }, [attempt, client, fileId, materialId, revisionId]);

  if (state.status === "failed") return <div className="material-photo-error">
    <p role="status">Не удалось открыть фото</p>
    <button className="button" type="button" onClick={() => {
      onRetry();
      setState({ status: "requesting" });
      setAttempt((value) => value + 1);
    }}>Повторить</button>
  </div>;

  return <>
    {state.status !== "ready" && <Spinner label="Загружаем фото" />}
    {"href" in state && <img src={state.href} alt={title} referrerPolicy="no-referrer"
      className={state.status === "loading" ? "material-photo-loading" : undefined}
      onLoad={() => setState({ status: "ready", href: state.href })}
      onError={() => setState({ status: "failed" })} />}
  </>;
}

type Props = {
  file: MaterialAttachment;
  publication: MaterialPublication;
  index: number;
  count: number;
  onSelect: (index: number) => void;
  onClose: () => void;
};

export function MaterialPhotoViewer({ file, publication, index, count, onSelect, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const title = file.title || "Фото";

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => { if (element.open) element.close(); };
  }, []);

  function close() {
    dialog.current?.close();
    onClose();
  }

  function move(offset: number) {
    const next = index + offset;
    if (next >= 0 && next < count) onSelect(next);
  }

  function closeOnEmpty(event: MouseEvent<HTMLElement>) {
    if (event.target === event.currentTarget) close();
  }

  return <dialog ref={dialog} className="material-photo-viewer" aria-label="Просмотр фото"
    onCancel={(event) => { event.preventDefault(); close(); }}
    onKeyDown={(event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    }}
    onClick={closeOnEmpty}>
    <header className="material-photo-header" onClick={closeOnEmpty}>
      <span className="material-photo-title" title={title}>{title}</span>
      <button ref={closeButton} className="material-photo-control" type="button"
        aria-label="Закрыть фото" title="Закрыть фото" onClick={close}>
        <X size={22} aria-hidden="true" />
      </button>
    </header>
    <div className="material-photo-stage" onClick={closeOnEmpty}>
      <MaterialPhotoFrame key={file.fileId} fileId={file.fileId} title={title} publication={publication}
        onRetry={() => closeButton.current?.focus()} />
    </div>
    <div className="material-photo-footer" onClick={closeOnEmpty}>
      <button className="material-photo-control" type="button" aria-label="Предыдущее фото" title="Предыдущее фото"
        aria-disabled={index === 0} onClick={() => move(-1)}><ChevronLeft size={24} aria-hidden="true" /></button>
      <span className="material-photo-count" role="status">{index + 1} / {count}</span>
      <button className="material-photo-control" type="button" aria-label="Следующее фото" title="Следующее фото"
        aria-disabled={index + 1 === count} onClick={() => move(1)}><ChevronRight size={24} aria-hidden="true" /></button>
    </div>
  </dialog>;
}
