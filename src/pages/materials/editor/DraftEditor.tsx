import { ApolloError, useApolloClient, useMutation } from "@apollo/client";
import { Save } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  CREATE_MATERIAL_DRAFT_MUTATION, MATERIAL_DRAFT_QUERY, SAVE_MATERIAL_DRAFT_MUTATION,
  type DraftFields, type DraftRevision, type MaterialDraft, type NewDraftInput, type SaveDraftInput,
} from "../../../api/materialDrafts";
import { isMaterialID } from "../../../api/materials";
import { MaterialMarkdown } from "../MaterialMarkdown";
import { DraftAttachments } from "./DraftAttachments";
import { DraftTopics } from "./DraftTopics";
import { attachmentInputs, changes, draftFields, draftInputError, emptyDraft, isMarkdownRevision, isOwnedDraft, sourceTooLarge } from "./draftForm";
import { useDraftGuard } from "./useDraftGuard";

export function DraftEditor({ material, authorId }: { material?: MaterialDraft; authorId: string | null }) {
  const navigate = useNavigate();
  const client = useApolloClient();
  const slug = useRef("");
  const saving = useRef(false);
  const [saved, setSaved] = useState(() => material ? draftFields(material) : emptyDraft);
  const [fields, setFields] = useState(saved);
  const [revision, setRevision] = useState(material?.revision ?? null);
  const [created, setCreated] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [createDraft] = useMutation<{ createMaterialDraft: Pick<MaterialDraft, "id" | "revision"> | null }, { input: NewDraftInput }>(
    CREATE_MATERIAL_DRAFT_MUTATION, { fetchPolicy: "no-cache" },
  );
  const [saveDraft] = useMutation<{ saveMaterialDraft: DraftRevision | null }, { input: SaveDraftInput }>(
    SAVE_MATERIAL_DRAFT_MUTATION, { fetchPolicy: "no-cache" },
  );
  const diff = changes(fields, saved);
  const busy = pending || uploading;
  const pageGuard = useDraftGuard(diff.dirty || busy);

  useEffect(() => {
    if (created && !diff.dirty && !busy) navigate(`/materials/${created}/edit`, { replace: true });
  }, [created, diff.dirty, busy, navigate]);

  function edit<K extends keyof DraftFields>(field: K, value: DraftFields[K]) {
    setFields((current) => ({ ...current, [field]: value }));
    setStatus("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || busy || conflict || !diff.dirty) return;
    const invalid = draftInputError(fields);
    setError(invalid);
    if (invalid) return;
    saving.current = true;
    setPending(true);
    setStatus("");
    try {
      const values = { ...fields, title: fields.title.trim() };
      if (!material && !created) {
        slug.current ||= `material-${crypto.randomUUID()}`;
        const { data } = await createDraft({ variables: { input: {
          type: "note", title: values.title, slug: slug.current, source: values.source,
          learning: { topicIds: values.topicIds }, attachments: attachmentInputs(values.attachments),
        } } });
        const draft = data?.createMaterialDraft;
        if (!draft || !isMaterialID(draft.id) || !isMarkdownRevision(draft.revision) ||
          draft.revision.source !== values.source) throw new Error("Invalid draft response");
        setCreated(draft.id);
        setRevision(draft.revision);
      } else {
        if (!revision) throw new Error("No revision");
        const { data } = await saveDraft({ variables: { input: {
          materialId: material?.id ?? created,
          expectedRevisionId: revision.id, source: values.source,
          ...(diff.metadata && { metadata: { title: values.title, topicIds: values.topicIds } }),
          ...(diff.attachments && { attachments: attachmentInputs(values.attachments) }),
        } } });
        const next = data?.saveMaterialDraft;
        if (!isMarkdownRevision(next) || next.id === revision.id || next.source !== values.source) {
          throw new Error("Invalid revision response");
        }
        setRevision(next);
      }
      setFields(values);
      setSaved(values);
      setStatus("Черновик сохранен");
    } catch (cause) {
      const stale = cause instanceof ApolloError && cause.graphQLErrors.some((item) => item.extensions?.code === "REVISION_CONFLICT");
      setConflict(stale);
      setError(stale ? "Черновик изменился на сервере. Ваши правки остались в редакторе." : "Не удалось сохранить черновик. Ваши правки остались в редакторе.");
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  async function discardAndReload() {
    if (!material || busy) return;
    setPending(true);
    try {
      const { data } = await client.query<{ material: MaterialDraft | null }>({
        query: MATERIAL_DRAFT_QUERY, variables: { id: material.id }, fetchPolicy: "no-cache",
      });
      const latest = data.material;
      if (!isOwnedDraft(latest, material.id, authorId) || !isMarkdownRevision(latest.revision)) throw new Error("No draft");
      const values = draftFields(latest);
      setFields(values);
      setSaved(values);
      setRevision(latest.revision);
      setConflict(false);
      setError("");
      setStatus("Открыта новая версия");
    } catch {
      setError("Не удалось загрузить новую версию. Ваши правки остались в редакторе.");
    } finally {
      setPending(false);
    }
  }

  return <>
    <header className="page-heading draft-page-heading">
      <h1>{material ? "Редактор черновика" : "Новый черновик"}</h1>
      {revision && <span className="material-meta">Ревизия {revision.number}</span>}
    </header>
    <form onSubmit={(event) => void save(event)}>
      <fieldset disabled={pending} className="editor-fields">
        <label className="editor-label">Заголовок
          <input value={fields.title} maxLength={256} onChange={(event) => edit("title", event.target.value)} />
        </label>
        <div className="editor-layout">
          <section aria-label="Текст черновика">
            <div className="editor-mode" role="group" aria-label="Режим редактора">
              <button type="button" className="button button--ghost" aria-pressed={!preview} onClick={() => setPreview(false)}>Markdown</button>
              <button type="button" className="button button--ghost" aria-pressed={preview} onClick={() => setPreview(true)}>Предпросмотр</button>
            </div>
            {preview ? <div className="editor-preview">
              {sourceTooLarge(fields.source) ? <p className="message message--error" role="alert">Для предпросмотра текст должен занимать не больше 128 КБ.</p> :
                fields.source.trim() ? <MaterialMarkdown source={fields.source} /> : <p>Нет текста</p>}
            </div> : <textarea aria-label="Текст Markdown" spellCheck={false} value={fields.source}
              onChange={(event) => edit("source", event.target.value)} />}
          </section>
          <aside className="editor-sidebar">
            <DraftTopics ids={fields.topicIds} onChange={(ids) => edit("topicIds", ids)} />
            <DraftAttachments items={fields.attachments} onChange={(files) => edit("attachments", files)} onPending={setUploading} />
          </aside>
        </div>
      </fieldset>
      {error && <p className="message message--error" role="alert">{error}</p>}
      <div className="draft-actions">
        <button className="button button--primary" type="submit" disabled={!diff.dirty || busy || conflict}>
          <Save size={16} aria-hidden="true" /> {pending ? "Сохраняем" : "Сохранить"}
        </button>
        {conflict && <button type="button" className="button button--ghost" disabled={busy} onClick={() => void discardAndReload()}>
          Сбросить правки и загрузить версию
        </button>}
        <span role="status">{status || (diff.dirty ? "Есть несохраненные правки" : "")}</span>
      </div>
    </form>
    {pageGuard}
  </>;
}
