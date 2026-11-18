import { useMutation, useQuery } from "@apollo/client";
import { Check, GitMerge, MessageSquareWarning } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { MaterialChange } from "../../../api/materialChanges";
import {
  MATERIAL_REVIEW_PUBLICATION_QUERY, MATERIAL_REVIEW_STATUS_QUERY, MERGE_MATERIAL_CHANGE_MUTATION,
  SUBMIT_MATERIAL_REVIEW_MUTATION, type MaterialReviewDecisionKind, type MaterialReviewStatus,
} from "../../../api/materialReview";
import { isMaterialID } from "../../../api/materials";
import { Spinner } from "../../../components/common/Spinner";
import { useAuth } from "../../../context/AuthContext";
import { changeHref } from "../changes/changeRoutes";
import { ReviewThreads } from "./ReviewThreads";
import { fitsReviewText, hasReviewError } from "./reviewInputs";
import "./review.css";

const outcomes = {
  waiting_candidates: "Ожидает рецензентов", pending: "На ревью", approved: "Одобрено", changes_requested: "Нужны правки",
};

type Props = {
  change: MaterialChange;
  proposalStatus: MaterialChange["status"];
  revision: { id: string; ordinal: number };
  refresh: () => Promise<unknown>;
  selectCurrent?: () => void;
};

export default function ChangeReview({ change, proposalStatus, revision, refresh, selectCurrent }: Props) {
  const { userId } = useAuth();
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [merged, setMerged] = useState(false);
  const [baseConflict, setBaseConflict] = useState(false);
  const publication = useQuery<{ publishedMaterial: { id: string; authorId: string | null; publishedRevisionId: string | null } | null }>(
    MATERIAL_REVIEW_PUBLICATION_QUERY, { variables: { id: change.materialId }, skip: !isMaterialID(change.materialId), fetchPolicy: "no-cache" },
  );
  const status = useQuery<{ materialReviewStatus: MaterialReviewStatus | null }>(MATERIAL_REVIEW_STATUS_QUERY, {
    variables: { id: change.id, revisionId: revision.id }, fetchPolicy: "no-cache",
  });
  const [vote, voting] = useMutation<{ submitMaterialReview: { reviewerId: string; decision: MaterialReviewDecisionKind } | null },
    { input: { proposalId: string; revisionId: string; decision: MaterialReviewDecisionKind; reason: string } }>(
    SUBMIT_MATERIAL_REVIEW_MUTATION, { fetchPolicy: "no-cache" },
  );
  const [merge, merging] = useMutation<{ mergeMaterialChange: { materialId: string; publishedRevisionId: string } | null },
    { id: string; expectedHeadId: string }>(MERGE_MATERIAL_CHANGE_MUTATION, { fetchPolicy: "no-cache" });
  const published = publication.error ? null : publication.data?.publishedMaterial;
  const owner = !!userId && published?.id === change.materialId && userId === published.authorId;
  const author = !!userId && userId === change.authorId;
  const review = !status.error && status.data?.materialReviewStatus?.revisionId === revision.id ? status.data.materialReviewStatus : null;
  const open = proposalStatus === "open" && !merged;
  const current = review?.current === true && revision.id === change.head.id;
  const assigned = current && review?.assignments.some((entry) => entry.reviewerId === userId);
  const voted = review?.decisions.some((entry) => entry.reviewerId === userId && !entry.legacy);
  const mayVote = open && !author && assigned && !voted && review?.waitReason !== "eligibility_unverified";
  const needsRebase = baseConflict || change.baseOutdated ||
    (!!published?.publishedRevisionId && published.publishedRevisionId !== change.baseRevisionId);
  const mayMerge = open && owner && current && !needsRebase && review?.outcome === "approved" &&
    review.hasUnresolvedDiscussions === false;
  const refreshStatus = () => status.refetch().catch(() => undefined);

  async function submit(decision: MaterialReviewDecisionKind) {
    const message = reason.trim();
    if (!mayVote || voting.loading || (decision === "request_changes" && !message) || !fitsReviewText(message)) return;
    setProblem("");
    try {
      const { data } = await vote({ variables: { input: { proposalId: change.id, revisionId: revision.id, decision, reason: message } } });
      if (data?.submitMaterialReview?.reviewerId !== userId || data?.submitMaterialReview?.decision !== decision) {
        throw new Error("Invalid vote response");
      }
      setReason("");
      await refreshStatus();
    } catch (error) {
      if (hasReviewError(error, "REVISION_CONFLICT")) {
        setProblem("Версия изменилась. Этот голос не был принят.");
        await refreshStatus();
      } else {
        setProblem("Не удалось отправить решение.");
      }
    }
  }

  async function accept() {
    if (!mayMerge || !confirmed || merging.loading) return;
    setProblem("");
    try {
      const { data } = await merge({ variables: { id: change.id, expectedHeadId: change.head.id } });
      const result = data?.mergeMaterialChange;
      if (result?.materialId !== change.materialId || !isMaterialID(result.publishedRevisionId)) throw new Error("Invalid merge response");
      setMerged(true);
      setConfirmed(false);
      await refresh().catch(() => undefined);
    } catch (error) {
      setConfirmed(false);
      if (hasReviewError(error, "MERGE_CONFLICT")) {
        setBaseConflict(true);
        setProblem("Опубликованная версия изменилась. Перед принятием нужно обновить основу.");
      } else if (hasReviewError(error, "REVISION_CONFLICT")) {
        setProblem("В предложении появилась новая версия. Проверьте ее перед принятием.");
      } else if (hasReviewError(error, "UNRESOLVED_DISCUSSIONS")) {
        setProblem("Остались незакрытые обсуждения.");
      } else {
        setProblem("Не удалось принять правку. Проверьте состояние ревью.");
      }
      await Promise.all([refresh().catch(() => undefined), refreshStatus()]);
    }
  }

  return <div className="material-review">
    <section aria-labelledby="review-heading">
      <div className="review-heading">
        <h2 id="review-heading">Ревью версии {revision.ordinal}</h2>
        {selectCurrent && <button type="button" className="button button--ghost" onClick={selectCurrent}>Текущая версия</button>}
      </div>
      {status.loading ? <Spinner label="Загружаем решения" /> : status.error || !review ?
        <div className="review-actions">
          <p role="alert">Не удалось загрузить состояние ревью.</p>
          <button type="button" className="button button--ghost" onClick={() => void refreshStatus()}>Повторить</button>
        </div> : <>
          {current ? <p className="badge" role="status">{outcomes[review.outcome]}</p> :
            <p role="status">{open ? "Голоса этой версии не учитываются при принятии текущей." : "Ревью этой версии завершено."}</p>}
          {!current && open && revision.id === change.head.id && <button type="button" className="button button--ghost"
            onClick={() => void refresh().catch(() => undefined)}>Обновить предложение</button>}
          {current && revision.ordinal > 1 && <p className="review-meta">Решения по предыдущим версиям не переносятся.</p>}
          {review.decisions.length > 0 ? <ul className="review-decisions">
            {review.decisions.map((entry, index) => <li key={`${entry.reviewerId}-${index}`}>
              {isMaterialID(entry.reviewerId) && <Link to={`/users/${entry.reviewerId}`}>Рецензент {entry.reviewerId.slice(-6)}</Link>}
              <strong>{entry.decision === "approve" ? "Одобрил" : "Запросил правки"}</strong>
              {entry.legacy && <span>Не учитывается в кворуме</span>}
              {entry.reason && <p>{entry.reason}</p>}
            </li>)}
          </ul> : <p className="review-meta">Для этой версии решений еще нет.</p>}
          {author && current && open && <p className="review-meta">Автор предложения не может голосовать за него.</p>}
          {mayVote && <div className="review-vote">
            <label>Комментарий к решению
              <textarea rows={2} value={reason} maxLength={4096} disabled={voting.loading} onChange={(event) => setReason(event.target.value)} />
            </label>
            {!fitsReviewText(reason) && <p role="alert">Комментарий превышает 4096 байт.</p>}
            <div className="review-actions">
              <button type="button" className="button button--primary" disabled={voting.loading || !fitsReviewText(reason)}
                onClick={() => void submit("approve")}><Check size={16} aria-hidden="true" /> Одобрить</button>
              <button type="button" className="button button--ghost" disabled={voting.loading || !reason.trim() || !fitsReviewText(reason)}
                onClick={() => void submit("request_changes")}><MessageSquareWarning size={16} aria-hidden="true" /> Запросить правки</button>
            </div>
          </div>}
        </>}
      {open && needsRebase && <div className="review-actions">
        <p>Основа предложения устарела.</p>
        {author && <Link className="button button--ghost" to={`${changeHref(change.id)}/rebase`}>Обновить основу</Link>}
      </div>}
      {open && current && owner && review?.hasUnresolvedDiscussions && <p>Принятие недоступно, пока есть незакрытые обсуждения.</p>}
      {open && current && owner && review?.hasUnresolvedDiscussions === null && <p>Сервер не вернул состояние обсуждений.</p>}
      {mayMerge && <div className="review-actions">
        {!confirmed ? <button type="button" className="button button--primary" onClick={() => setConfirmed(true)}>
          <GitMerge size={16} aria-hidden="true" /> Принять правку
        </button> : <>
          <strong>Опубликовать эту версию материала?</strong>
          <button type="button" className="button button--primary" disabled={merging.loading} onClick={() => void accept()}>Опубликовать</button>
          <button type="button" className="button button--ghost" disabled={merging.loading} onClick={() => setConfirmed(false)}>Отмена</button>
        </>}
      </div>}
      {merged && <p role="status">Правка опубликована. <Link to={`/materials/${change.materialId}`}>Открыть материал</Link></p>}
      {problem && <p className="message message--error" role="alert">{problem}</p>}
    </section>
    <ReviewThreads id={change.id} revision={revision} actorId={userId}
      mayDiscuss={open && (author || owner || !!assigned)} mayResolveAll={author || owner}
      onChange={() => void refreshStatus()} />
  </div>;
}
