import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { isMaterialID, type MaterialAttachment } from "../../../api/materials";
import { DraftPhotoPicker } from "./DraftPhotoPicker";
import { sourceTooLarge } from "./draftForm";
import type { PhotoInsertion } from "./materialPhotoEditing";

type PickerState = {
  plan: PhotoInsertion;
  insert: typeof import("./materialPhotoEditing")["insertPhotoGroup"];
};

type Props = {
  source: string;
  attachments: MaterialAttachment[];
  busy: boolean;
  onChange: (value: string) => void;
};

export function DraftPhotoText({ source, attachments, busy, onChange }: Props) {
  const text = useRef<HTMLTextAreaElement>(null);
  const opening = useRef(false);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [problem, setProblem] = useState("");
  const photos = attachments.filter(({ kind, fileId }) => kind === "image" && isMaterialID(fileId));

  async function choosePhotos() {
    const input = text.current;
    if (!input || opening.current || !photos.length || busy) return;
    const { selectionEnd, value } = input;
    if (sourceTooLarge(value)) {
      setProblem("Текст должен занимать не больше 128 КБ.");
      return;
    }
    opening.current = true;
    setProblem("");
    try {
      const { planPhotoInsertion, insertPhotoGroup } = await import("./materialPhotoEditing");
      if (text.current !== input || value !== input.value) return;
      const result = planPhotoInsertion(value, selectionEnd);
      setPicker(result.plan ? { plan: result.plan, insert: insertPhotoGroup } : null);
      setProblem(result.problem ?? "");
    } catch {
      setProblem("Не удалось открыть выбор фото.");
    } finally {
      opening.current = false;
    }
  }

  return <>
    <div className="editor-photo-tools">
      <button type="button" className="button button--ghost editor-icon" aria-label="Вставить фото" title="Вставить фото"
        disabled={!photos.length || busy} onClick={() => void choosePhotos()}>
        <ImagePlus size={18} aria-hidden="true" />
      </button>
    </div>
    {problem && <p className="message message--error" role="alert">{problem}</p>}
    <textarea ref={text} aria-label="Текст Markdown" spellCheck={false} value={source}
      onChange={(event) => { setProblem(""); onChange(event.target.value); }} />
    {picker && <DraftPhotoPicker files={photos} limit={picker.plan.limit} onClose={() => setPicker(null)}
      onInsert={(ids) => {
        if (text.current?.value !== picker.plan.source) return "Текст изменился. Откройте выбор фото заново.";
        const result = picker.insert(picker.plan, ids);
        if (!result) return "Не удалось вставить группу в этом месте.";
        if (sourceTooLarge(result.source)) return "Текст должен занимать не больше 128 КБ.";
        onChange(result.source);
        requestAnimationFrame(() => {
          const input = text.current;
          if (input?.value !== result.source) return;
          input.focus();
          input.setSelectionRange(result.caret, result.caret);
        });
        return "";
      }} />}
  </>;
}
