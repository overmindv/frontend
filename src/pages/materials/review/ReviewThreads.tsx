import { useMutation, useQuery } from "@apollo/client";
import { MessageSquarePlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  CREATE_MATERIAL_REVIEW_THREAD_MUTATION, MATERIAL_REVIEW_THREADS_QUERY, type MaterialReviewPage, type MaterialReviewThread,
} from "../../../api/materialReview";
import { Spinner } from "../../../components/common/Spinner";
import { fitsReviewText } from "./reviewInputs";
import { ReviewThreadCard } from "./ReviewThreadCard";

type Props = {
  id: string;
  revision: { id: string; ordinal: number };
  actorId: string | null;
  mayDiscuss: boolean;
  mayResolveAll: boolean;
  onChange: () => void;
};

export function ReviewThreads({ id, revision, actorId, mayDiscuss, mayResolveAll, onChange }: Props) {
  const [after, setAfter] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [line, setLine] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState<MaterialReviewThread>();
  const query = useQuery<{ materialReviewThreads: MaterialReviewPage<MaterialReviewThread> | null }>(MATERIAL_REVIEW_THREADS_QUERY, {
    variables: { id, after }, fetchPolicy: "no-cache",
  });
  const [create, { loading }] = useMutation<{ createMaterialReviewThread: MaterialReviewThread | null },
    { input: { proposalId: string; revisionId: string; lineNumber: number; body: string } }>(
    CREATE_MATERIAL_REVIEW_THREAD_MUTATION, { fetchPolicy: "no-cache" },
  );
  const page = query.data?.materialReviewThreads;
  const items = page?.items ?? [];
  const threads = added && !items.some((entry) => entry.id === added.id) ? [...items, added] : items;
  const lineNumber = Number(line || "0");
  const lineValid = Number.isInteger(lineNumber) && lineNumber >= 0 && lineNumber <= 2147483647;
  const valid = !!body.trim() && fitsReviewText(body) && lineValid;

  async function post(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mayDiscuss || !valid || loading) return;
    setError("");
    try {
      const { data } = await create({ variables: { input: { proposalId: id, revisionId: revision.id, lineNumber, body: body.trim() } } });
      const thread = data?.createMaterialReviewThread;
      if (!thread || thread.revisionId !== revision.id) throw new Error("Invalid thread response");
      setAdded(thread);
      setBody("");
      setLine("");
      void query.refetch().catch(() => undefined);
      onChange();
    } catch {
      setError("Не удалось добавить обсуждение. Проверьте номер строки.");
    }
  }

  return <section aria-labelledby="review-threads-heading">
    <h2 id="review-threads-heading">Обсуждения</h2>
    {query.loading ? <Spinner label="Загружаем обсуждения" /> : query.error || !page ?
      <div className="review-actions">
        <p role="alert">Не удалось загрузить обсуждения.</p>
        <button type="button" className="button button--ghost" onClick={() => void query.refetch().catch(() => undefined)}>Повторить</button>
      </div> : threads.length === 0 ? <p className="review-meta">Обсуждений пока нет.</p> :
        <ul className="review-threads">
          {threads.map((thread) => <li key={thread.id}><ReviewThreadCard id={id} thread={thread}
            selectedRevisionId={revision.id} mayReply={mayDiscuss} mayResolve={mayDiscuss && (mayResolveAll || thread.authorId === actorId)}
            onResolution={(resolved) => {
              setAdded((value) => value?.id === thread.id ? { ...value, resolved } : value);
              void query.refetch().catch(() => undefined);
              onChange();
            }} /></li>)}
        </ul>}
    {(after !== null || page?.nextAfterId) && <nav className="review-actions" aria-label="Страницы обсуждений">
      {after !== null && <button type="button" className="button button--ghost" onClick={() => { setAfter(null); setAdded(undefined); }}>Первые обсуждения</button>}
      {page?.nextAfterId && <button type="button" className="button button--ghost"
        onClick={() => { setAfter(page.nextAfterId); setAdded(undefined); }}>Следующие обсуждения</button>}
    </nav>}
    {mayDiscuss && <form onSubmit={(event) => void post(event)} className="review-comment-form">
      <label>Строка версии {revision.ordinal} (необязательно)
        <input type="number" min={1} max={2147483647} value={line} disabled={loading} onChange={(event) => setLine(event.target.value)} />
      </label>
      <label>Комментарий к версии {revision.ordinal}
        <textarea rows={3} maxLength={4096} value={body} disabled={loading} onChange={(event) => setBody(event.target.value)} />
      </label>
      {!fitsReviewText(body) && <p role="alert">Комментарий превышает 4096 байт.</p>}
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="button button--primary" disabled={!valid || loading}>
        <MessageSquarePlus size={16} aria-hidden="true" /> Добавить обсуждение
      </button>
    </form>}
  </section>;
}
