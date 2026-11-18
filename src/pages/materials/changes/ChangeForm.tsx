import { ApolloError, useMutation } from "@apollo/client";
import { GitCommitHorizontal, GitPullRequest } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  APPEND_MATERIAL_CHANGE_MUTATION, OPEN_MATERIAL_CHANGE_MUTATION, type AppendMaterialChangeInput, type OpenMaterialChangeInput,
} from "../../../api/materialChanges";
import { isMaterialID } from "../../../api/materials";
import { REBASE_MATERIAL_CHANGE_MUTATION } from "../../../api/materialReview";
import { MaterialMarkdown } from "../MaterialMarkdown";
import { sourceTooLarge } from "../editor/draftForm";
import { useDraftGuard } from "../editor/useDraftGuard";
import { changeHref } from "./changeRoutes";

type Target = ({ materialId: string; baseRevisionId: string } |
  { proposalId: string; expectedHeadId: string; newBase?: { id: string; source: string; number: number } }) & { number: number };
const encoder = new TextEncoder();

export function ChangeForm({ target, source, title }: { target: Target; source: string; title?: string }) {
  const navigate = useNavigate();
  const [text, setText] = useState(source);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [problem, setProblem] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState("");
  const [checkedBase, setCheckedBase] = useState(false);
  const writing = useRef(false);
  const [open, opening] = useMutation<{ openMaterialChange: { id: string } | null }, { input: OpenMaterialChangeInput }>(
    OPEN_MATERIAL_CHANGE_MUTATION, { fetchPolicy: "no-cache" },
  );
  const [append, appending] = useMutation<{ appendMaterialChange: { id: string; head: { id: string; source: string } } | null },
    { input: AppendMaterialChangeInput }>(APPEND_MATERIAL_CHANGE_MUTATION, { fetchPolicy: "no-cache" });
  const [rebase, rebasing] = useMutation<{ rebaseMaterialChange: { id: string; baseRevisionId: string; head: { id: string; source: string } } | null },
    { input: AppendMaterialChangeInput & { baseRevisionId: string } }>(REBASE_MATERIAL_CHANGE_MUTATION, { fetchPolicy: "no-cache" });
  const busy = opening.loading || appending.loading || rebasing.loading;
  const editing = "proposalId" in target;
  const newBase = editing ? target.newBase : undefined;
  const empty = text === (newBase?.source ?? source) || !text.trim();
  const dirty = text !== source || message !== "" || checkedBase;
  const guard = useDraftGuard(!saved && (dirty || busy));

  useEffect(() => {
    if (saved) navigate(changeHref(saved), { replace: true });
  }, [navigate, saved]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writing.current || busy || conflict || saved) return;
    if (empty || (newBase && !checkedBase)) return;
    if (sourceTooLarge(text)) { setProblem("Текст должен занимать не больше 128 КБ."); return; }
    if (encoder.encode(message).length > 1024) { setProblem("Описание правки должно занимать не больше 1024 байт."); return; }
    writing.current = true;
    setProblem("");
    const content = { source: text, message: message.trim() };
    try {
      if ("proposalId" in target && target.newBase) {
        const { data } = await rebase({ variables: { input: {
          proposalId: target.proposalId, expectedHeadId: target.expectedHeadId, baseRevisionId: target.newBase.id, ...content,
        } } });
        const change = data?.rebaseMaterialChange;
        if (change?.id !== target.proposalId || change.baseRevisionId !== target.newBase.id ||
          !isMaterialID(change.head.id) || change.head.id === target.expectedHeadId || change.head.source !== text) {
          throw new Error("Invalid rebase response");
        }
        setSaved(change.id);
      } else if ("proposalId" in target) {
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
      const codes = error instanceof ApolloError ? error.graphQLErrors.map(({ extensions }) => extensions?.code) : [];
      const stale = codes.includes("REVISION_CONFLICT");
      const moved = codes.includes("MERGE_CONFLICT");
      setConflict(stale || moved);
      setProblem(moved ? "Опубликованная версия снова изменилась. Правки остались в форме." :
        stale ? "Версия изменилась на сервере. Правки остались в форме." : "Не удалось сохранить предложение. Правки остались в форме.");
    } finally {
      writing.current = false;
    }
  }

  return <>
    <header className="page-heading change-heading">
      <div>
        <h1>{newBase ? "Обновить основу" : editing ? "Новая версия предложения" : "Предложить правку"}</h1>
        {title && <p>{title}</p>}
        <span className="material-meta">{editing ? "Предыдущая версия" : "Версия материала"}: {target.number}</span>
      </div>
    </header>
    <form className="change-form" onSubmit={(event) => void save(event)}>
      <fieldset className="editor-fields" disabled={busy || !!saved}>
        <div className={newBase ? "change-rebase-layout" : undefined}>
          {newBase && <section aria-labelledby="change-rebase-base">
            <h2 id="change-rebase-base">Опубликованная версия {newBase.number}</h2>
            <pre className="change-rebase-source">{newBase.source}</pre>
          </section>}
          <div>
            <div className="editor-mode" role="group" aria-label="Режим редактора">
              <button type="button" className="button button--ghost" aria-pressed={!preview} onClick={() => setPreview(false)}>Markdown</button>
              <button type="button" className="button button--ghost" aria-pressed={preview} onClick={() => setPreview(true)}>Предпросмотр</button>
            </div>
            {preview ? <div className="editor-preview">
              {sourceTooLarge(text) ? <p role="alert">Текст превышает 128 КБ.</p> : <MaterialMarkdown source={text} />}
            </div> : <textarea aria-label="Текст правки" value={text} spellCheck={false} onChange={(event) => setText(event.target.value)} />}
          </div>
        </div>
        <label className="editor-label">Описание правки
          <input value={message} maxLength={1024} onChange={(event) => setMessage(event.target.value)} />
        </label>
        {newBase && <label className="change-rebase-check">
          <input type="checkbox" checked={checkedBase} onChange={(event) => setCheckedBase(event.target.checked)} />
          Сверил текст с новой опубликованной версией
        </label>}
      </fieldset>
      {problem && <p className="message message--error" role="alert">{problem}</p>}
      <div className="change-actions">
        <button className="button button--primary" type="submit" disabled={empty || (!!newBase && !checkedBase) || conflict || busy || !!saved}>
          {editing ? <GitCommitHorizontal size={16} aria-hidden="true" /> : <GitPullRequest size={16} aria-hidden="true" />}
          {busy ? "Сохраняем" : newBase ? "Сохранить на новой основе" : editing ? "Сохранить версию" : "Создать предложение"}
        </button>
        {text === (newBase?.source ?? source) && <span>Нет изменений в тексте</span>}
      </div>
    </form>
    {guard}
  </>;
}
