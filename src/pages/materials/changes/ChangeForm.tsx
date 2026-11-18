import { ApolloError, useMutation } from "@apollo/client";
import { GitCommitHorizontal, GitPullRequest } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  APPEND_MATERIAL_CHANGE_MUTATION, OPEN_MATERIAL_CHANGE_MUTATION, type AppendMaterialChangeInput, type OpenMaterialChangeInput,
} from "../../../api/materialChanges";
import { isMaterialID } from "../../../api/materials";
import { MaterialMarkdown } from "../MaterialMarkdown";
import { sourceTooLarge } from "../editor/draftForm";
import { useDraftGuard } from "../editor/useDraftGuard";
import { changeHref } from "./changeRoutes";

type Target = ({ materialId: string; baseRevisionId: string } | { proposalId: string; expectedHeadId: string }) & { number: number };
const encoder = new TextEncoder();

export function ChangeForm({ target, source, title }: { target: Target; source: string; title?: string }) {
  const navigate = useNavigate();
  const [text, setText] = useState(source);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [problem, setProblem] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState("");
  const writing = useRef(false);
  const [open, opening] = useMutation<{ openMaterialChange: { id: string } | null }, { input: OpenMaterialChangeInput }>(
    OPEN_MATERIAL_CHANGE_MUTATION, { fetchPolicy: "no-cache" },
  );
  const [append, appending] = useMutation<{ appendMaterialChange: { id: string; head: { id: string; source: string } } | null },
    { input: AppendMaterialChangeInput }>(APPEND_MATERIAL_CHANGE_MUTATION, { fetchPolicy: "no-cache" });
  const busy = opening.loading || appending.loading;
  const editing = "proposalId" in target;
  const dirty = text !== source || message !== "";
  const guard = useDraftGuard(!saved && (dirty || busy));

  useEffect(() => {
    if (saved) navigate(changeHref(saved), { replace: true });
  }, [navigate, saved]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writing.current || busy || conflict || saved) return;
    if (text === source || !text.trim()) { setProblem("Измените текст материала."); return; }
    if (sourceTooLarge(text)) { setProblem("Текст должен занимать не больше 128 КБ."); return; }
    if (encoder.encode(message).length > 1024) { setProblem("Описание правки должно занимать не больше 1024 байт."); return; }
    writing.current = true;
    setProblem("");
    const content = { source: text, message: message.trim() };
    try {
      if ("proposalId" in target) {
        const { data } = await append({ variables: { input: { proposalId: target.proposalId, expectedHeadId: target.expectedHeadId, ...content } } });
        const change = data?.appendMaterialChange;
        if (change?.id !== target.proposalId || !isMaterialID(change.head.id) || change.head.id === target.expectedHeadId ||
          change.head.source !== text) throw new Error("Invalid proposal response");
        setSaved(change.id);
      } else {
        const { data } = await open({ variables: { input: { materialId: target.materialId, baseRevisionId: target.baseRevisionId, ...content } } });
        const id = data?.openMaterialChange?.id;
        if (!id || !isMaterialID(id)) throw new Error("Invalid proposal response");
        setSaved(id);
      }
    } catch (error) {
      const stale = error instanceof ApolloError && error.graphQLErrors.some(({ extensions }) => extensions?.code === "REVISION_CONFLICT");
      setConflict(stale);
      setProblem(stale ? "Версия изменилась на сервере. Правки остались в форме." : "Не удалось сохранить предложение. Правки остались в форме.");
    } finally {
      writing.current = false;
    }
  }

  return <>
    <header className="page-heading change-heading">
      <div>
        <h1>{editing ? "Новая версия предложения" : "Предложить правку"}</h1>
        {title && <p>{title}</p>}
        <span className="material-meta">{editing ? "Предыдущая версия" : "Версия материала"}: {target.number}</span>
      </div>
    </header>
    <form className="change-form" onSubmit={(event) => void save(event)}>
      <fieldset className="editor-fields" disabled={busy || !!saved}>
        <div className="editor-mode" role="group" aria-label="Режим редактора">
          <button type="button" className="button button--ghost" aria-pressed={!preview} onClick={() => setPreview(false)}>Markdown</button>
          <button type="button" className="button button--ghost" aria-pressed={preview} onClick={() => setPreview(true)}>Предпросмотр</button>
        </div>
        {preview ? <div className="editor-preview">
          {sourceTooLarge(text) ? <p role="alert">Текст превышает 128 КБ.</p> : <MaterialMarkdown source={text} />}
        </div> : <textarea aria-label="Текст правки" value={text} spellCheck={false} onChange={(event) => setText(event.target.value)} />}
        <label className="editor-label">Описание правки
          <input value={message} maxLength={1024} onChange={(event) => setMessage(event.target.value)} />
        </label>
      </fieldset>
      {problem && <p className="message message--error" role="alert">{problem}</p>}
      <div className="change-actions">
        <button className="button button--primary" type="submit" disabled={text === source || !text.trim() || conflict || busy || !!saved}>
          {editing ? <GitCommitHorizontal size={16} aria-hidden="true" /> : <GitPullRequest size={16} aria-hidden="true" />}
          {busy ? "Сохраняем" : editing ? "Сохранить версию" : "Создать предложение"}
        </button>
        {text === source && <span>Нет изменений в тексте</span>}
      </div>
    </form>
    {guard}
  </>;
}
