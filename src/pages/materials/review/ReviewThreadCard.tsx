import { useMutation, useQuery } from "@apollo/client";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  MATERIAL_REVIEW_REPLIES_QUERY, REPLY_TO_MATERIAL_REVIEW_THREAD_MUTATION, SET_MATERIAL_REVIEW_THREAD_RESOLVED_MUTATION,
  type MaterialReviewPage, type MaterialReviewReply, type MaterialReviewThread,
} from "../../../api/materialReview";
import { isMaterialID, materialDate } from "../../../api/materials";
import { fitsReviewText } from "./reviewInputs";

type Props = {
  id: string;
  thread: MaterialReviewThread;
  selectedRevisionId: string;
  mayReply: boolean;
  mayResolve: boolean;
  onResolution: (resolved: boolean) => void;
};

function CommentInfo({ authorId, createdAt }: { authorId: string; createdAt: string }) {
  return <div className="review-meta">
    {isMaterialID(authorId) && <Link to={`/users/${authorId}`}>Участник {authorId.slice(-6)}</Link>}
    <time dateTime={createdAt}>{materialDate(createdAt)}</time>
  </div>;
}

export function ReviewThreadCard({ id, thread, selectedRevisionId, mayReply, mayResolve, onResolution }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [after, setAfter] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [lastReply, setLastReply] = useState<MaterialReviewReply>();
  const replies = useQuery<{ materialReviewReplies: MaterialReviewPage<MaterialReviewReply> | null }>(MATERIAL_REVIEW_REPLIES_QUERY, {
    variables: { id, threadId: thread.id, after }, skip: !expanded, fetchPolicy: "no-cache",
  });
  const [reply, replying] = useMutation<{ replyToMaterialReviewThread: MaterialReviewReply | null },
    { id: string; threadId: string; body: string }>(REPLY_TO_MATERIAL_REVIEW_THREAD_MUTATION, { fetchPolicy: "no-cache" });
  const [resolve, resolving] = useMutation<{ setMaterialReviewThreadResolved: { id: string; resolved: boolean } | null },
    { id: string; threadId: string; resolved: boolean }>(SET_MATERIAL_REVIEW_THREAD_RESOLVED_MUTATION, { fetchPolicy: "no-cache" });
  const page = replies.data?.materialReviewReplies;
  const items = page?.items ?? [];
  const visible = lastReply && !items.some((entry) => entry.id === lastReply.id) ? [...items, lastReply] : items;

  async function post(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mayReply || replying.loading || !body.trim() || !fitsReviewText(body)) return;
    setError("");
    try {
      const { data } = await reply({ variables: { id, threadId: thread.id, body: body.trim() } });
      if (!data?.replyToMaterialReviewThread) throw new Error("Invalid reply response");
      setLastReply(data.replyToMaterialReviewThread);
      setBody("");
      void replies.refetch().catch(() => undefined);
    } catch {
      setError("Не удалось отправить ответ.");
    }
  }

  async function toggleResolved() {
    if (!mayResolve || resolving.loading) return;
    setError("");
    try {
      const { data } = await resolve({ variables: { id, threadId: thread.id, resolved: !thread.resolved } });
      const updated = data?.setMaterialReviewThreadResolved;
      if (updated?.id !== thread.id || updated.resolved === thread.resolved) throw new Error("Invalid resolution response");
      onResolution(updated.resolved);
    } catch {
      setError("Не удалось изменить состояние обсуждения.");
    }
  }

  return <article>
    <div className="review-heading">
      <strong>{thread.lineNumber ? `Строка ${thread.lineNumber}` : "Ко всей версии"}</strong>
      <span className="badge">{thread.resolved ? "Решено" : "Открыто"}</span>
    </div>
    <p className="review-meta" title={thread.revisionId}>
      {thread.revisionId === selectedRevisionId ? "Выбранная версия" : `Версия …${thread.revisionId.slice(-8)}`}
    </p>
    <CommentInfo authorId={thread.authorId} createdAt={thread.createdAt} />
    <p className="review-body">{thread.body}</p>
    <div className="review-actions">
      <button type="button" className="button button--ghost" aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}>{expanded ? "Скрыть ответы" : "Ответы"}</button>
      {mayResolve && <button type="button" className="button button--ghost" disabled={resolving.loading}
        onClick={() => void toggleResolved()}>{thread.resolved ? "Открыть снова" : "Отметить решенным"}</button>}
    </div>
    {expanded && <div className="review-replies">
      {replies.loading ? <p role="status">Загружаем ответы</p> : replies.error || !page ?
        <button type="button" className="button button--ghost" onClick={() => void replies.refetch().catch(() => undefined)}>Повторить загрузку</button> :
        visible.length === 0 ? <p className="review-meta">Ответов пока нет.</p> :
          <ul>{visible.map((entry) => <li key={entry.id}>
            <CommentInfo authorId={entry.authorId} createdAt={entry.createdAt} />
            <p className="review-body">{entry.body}</p>
          </li>)}</ul>}
      {(after !== null || page?.nextAfterId) && <div className="review-actions">
        {after !== null && <button type="button" className="button button--ghost" onClick={() => { setAfter(null); setLastReply(undefined); }}>Первые ответы</button>}
        {page?.nextAfterId && <button type="button" className="button button--ghost"
          onClick={() => { setAfter(page.nextAfterId); setLastReply(undefined); }}>Следующие ответы</button>}
      </div>}
      {mayReply && <form className="review-comment-form" onSubmit={(event) => void post(event)}>
        <label>Ответ
          <textarea rows={2} value={body} maxLength={4096} disabled={replying.loading} onChange={(event) => setBody(event.target.value)} />
        </label>
        {!fitsReviewText(body) && <p role="alert">Ответ превышает 4096 байт.</p>}
        <button type="submit" className="button button--primary" disabled={replying.loading || !body.trim() || !fitsReviewText(body)}>Ответить</button>
      </form>}
    </div>}
    {error && <p className="message message--error" role="alert">{error}</p>}
  </article>;
}
