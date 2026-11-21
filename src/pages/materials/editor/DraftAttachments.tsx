import { Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { attachmentFileError, materialFileAccept, maxMaterialAttachments, uploadMaterialAttachment } from "../../../api/materialMedia";
import type { MaterialAttachment } from "../../../api/materials";

type Props = {
  items: MaterialAttachment[];
  onChange: (items: MaterialAttachment[]) => void;
  onPending: (pending: boolean) => void;
};

export function DraftAttachments({ items, onChange, onPending }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const currentUpload = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => currentUpload.current?.abort(), []);

  async function upload(file: File) {
    if (currentUpload.current || items.length >= maxMaterialAttachments) return;
    const invalid = attachmentFileError(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    const controller = new AbortController();
    currentUpload.current = controller;
    setError("");
    setPending(true);
    onPending(true);
    try {
      const attachment = await uploadMaterialAttachment(file, controller.signal);
      if (!controller.signal.aborted) onChange([...items, { ...attachment, position: items.length }]);
    } catch {
      if (!controller.signal.aborted) setError("Не удалось загрузить вложение. Попробуйте снова.");
    } finally {
      currentUpload.current = null;
      if (!controller.signal.aborted) {
        setPending(false);
        onPending(false);
      }
    }
  }

  return <section className="editor-attachments" aria-labelledby="draft-attachments-heading">
    <div className="editor-section-heading">
      <h2 id="draft-attachments-heading">Вложения</h2>
      <span>{items.length}/{maxMaterialAttachments}</span>
    </div>
    {items.length > 0 && <ul className="editor-file-list">
      {items.map((item) => <li key={item.fileId}>
        <Paperclip size={16} aria-hidden="true" />
        <span>{item.title || "Вложение"}</span>
        <button type="button" className="button button--ghost editor-icon"
          aria-label={`Убрать вложение: ${item.title || "Вложение"}`} title="Убрать вложение" disabled={pending}
          onClick={() => onChange(items.filter((file) => file.fileId !== item.fileId))}>
          <X size={16} aria-hidden="true" />
        </button>
      </li>)}
    </ul>}
    {items.length < maxMaterialAttachments && <>
      <input ref={fileInput} hidden type="file" aria-label="Добавить вложение" accept={materialFileAccept}
        disabled={pending} onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }} />
      <button type="button" className="button button--ghost" disabled={pending} onClick={() => fileInput.current?.click()}>
        <Paperclip size={16} aria-hidden="true" /> Прикрепить файл
      </button>
    </>}
    {pending && <p role="status">Загружаем вложение</p>}
    {error && <p className="message message--error" role="alert">{error}</p>}
  </section>;
}
