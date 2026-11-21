import { ImagePlus, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { MaterialAttachment } from "../../../api/materials";

export function DraftPhotoPicker({ files, limit, onInsert, onClose }: {
  files: MaterialAttachment[]; limit: number; onInsert: (ids: string[]) => string; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

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

  return <dialog ref={dialog} className="editor-photo-picker" aria-labelledby={headingId}
    onCancel={(event) => { event.preventDefault(); close(); }}>
    <header className="editor-photo-header">
      <h2 id={headingId}>Вставить фото</h2>
      <button type="button" className="button button--ghost editor-icon" aria-label="Закрыть выбор фото" title="Закрыть выбор фото"
        onClick={close}><X size={18} aria-hidden="true" /></button>
    </header>
    <ul className="editor-photo-choices">
      {files.map((file) => {
        const order = selected.indexOf(file.fileId);
        return <li key={file.fileId}>
          <label className="editor-photo-choice">
            <input type="checkbox" checked={order !== -1} disabled={order === -1 && selected.length >= limit}
              onChange={(event) => {
                const checked = event.target.checked;
                setError("");
                setSelected((current) => checked ? [...current, file.fileId] : current.filter((id) => id !== file.fileId));
              }} />
            <span>{file.title || "Фото"}</span>
            <span aria-hidden="true">{order >= 0 ? order + 1 : ""}</span>
          </label>
        </li>;
      })}
    </ul>
    {error && <p role="alert" className="message message--error">{error}</p>}
    <footer className="editor-photo-footer">
      <span role="status">{selected.length} / {limit}</span>
      <button type="button" className="button button--primary" disabled={!selected.length} onClick={() => {
        const problem = onInsert(selected);
        if (problem) setError(problem);
        else close();
      }}>
        <ImagePlus size={17} aria-hidden="true" /> Вставить
      </button>
    </footer>
  </dialog>;
}
