import type { DraftFields, DraftRevision, MaterialDraft } from "../../../api/materialDrafts";
import { isMaterialID, type MaterialAttachment } from "../../../api/materials";

const maxSourceBytes = 128 * 1024;
const textEncoder = new TextEncoder();

export const emptyDraft: DraftFields = { title: "", source: "", topicIds: [], attachments: [] };

export function isMarkdownRevision(revision: DraftRevision | null | undefined): revision is DraftRevision {
  return !!revision && revision.format === "markdown" && isMaterialID(revision.id);
}

export function isOwnedDraft(draft: MaterialDraft | null | undefined, id: string, authorId: string | null): draft is MaterialDraft {
  return !!draft && draft.id === id && isMaterialID(id) && !!authorId && draft.authorId === authorId && draft.status === "draft";
}

export function draftFields(draft: MaterialDraft): DraftFields {
  return {
    title: draft.title,
    source: draft.revision?.source ?? "",
    topicIds: draft.learning?.topicIds.filter(isMaterialID) ?? [],
    attachments: draft.attachments.slice().sort((a, b) => a.position - b.position),
  };
}

export function changes(values: DraftFields, saved: DraftFields) {
  const title = values.title !== saved.title;
  const topics = values.topicIds.length !== saved.topicIds.length || values.topicIds.some((id) => !saved.topicIds.includes(id));
  const attachments = values.attachments.length !== saved.attachments.length ||
    values.attachments.some((file, index) => file.fileId !== saved.attachments[index]?.fileId);
  const source = values.source !== saved.source;
  return { metadata: title || topics, attachments, dirty: title || topics || attachments || source };
}

export function attachmentInputs(files: MaterialAttachment[]): MaterialAttachment[] {
  return files.map(({ fileId, kind, title }, position) => ({ fileId, kind, title, position }));
}

export function sourceTooLarge(text: string) {
  return text.length > maxSourceBytes || textEncoder.encode(text).length > maxSourceBytes;
}

export function draftInputError(values: DraftFields) {
  if (!values.title.trim()) return "Укажите заголовок.";
  if (textEncoder.encode(values.title).length > 256) return "Заголовок должен занимать не больше 256 байт.";
  if (!values.source.trim()) return "Добавьте текст материала.";
  if (sourceTooLarge(values.source)) return "Текст должен занимать не больше 128 КБ.";
  return "";
}
