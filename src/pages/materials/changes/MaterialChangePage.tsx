import { useMutation, useQuery } from "@apollo/client";
import { ArrowLeft, GitCommitHorizontal, GitPullRequestClosed } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CHANGE_AUTHOR_QUERY, CLOSE_MATERIAL_CHANGE_MUTATION, MATERIAL_CHANGE_QUERY, type MaterialChange,
} from "../../../api/materialChanges";
import { isMaterialID, materialDate } from "../../../api/materials";
import { Spinner } from "../../../components/common/Spinner";
import { useAuth } from "../../../context/AuthContext";
import { ChangeDiff } from "./ChangeDiff";
import { ChangeHistory } from "./ChangeHistory";
import { changeHref } from "./changeRoutes";
import "../materials.css";
import "./changes.css";

const statusLabels = { open: "Открыто", closed: "Закрыто", merged: "Принято" };
const ChangeReview = lazy(() => import("../review/ChangeReview"));

export default function MaterialChangePage() {
  const { changeId = "" } = useParams();
  const query = useQuery<{ materialChangeProposal: MaterialChange | null }>(MATERIAL_CHANGE_QUERY, {
    variables: { id: changeId, includeSource: false }, skip: !isMaterialID(changeId), fetchPolicy: "no-cache",
  });
  const change = query.data?.materialChangeProposal;
  const retry = query.error && query.error.graphQLErrors.every(({ extensions }) =>
    extensions?.code !== "NOT_FOUND" && extensions?.code !== "PERMISSION_DENIED");
  return <main className="page-shell material-change-page">
    {change?.id === changeId && isMaterialID(change.materialId) ?
      <Link className="back-link material-back" to={`/materials/${change.materialId}`}><ArrowLeft size={16} aria-hidden="true" /> К материалу</Link> :
      <Link className="back-link material-back" to="/materials"><ArrowLeft size={16} aria-hidden="true" /> Материалы</Link>}
    {query.loading ? <div className="content-state"><Spinner label="Открываем предложение" /></div> :
      retry ? <div className="content-state">
        <p role="alert">Не удалось открыть предложение.</p>
        <button type="button" className="button button--ghost" onClick={() => void query.refetch().catch(() => undefined)}>Повторить</button>
      </div> : change && change.id === changeId && isMaterialID(change.head.id) ?
        <ChangeView change={change} key={change.id} refresh={() => query.refetch()} /> :
        <div className="content-state"><h1>Предложение недоступно</h1></div>}
  </main>;
}

function ChangeView({ change, refresh }: { change: MaterialChange; refresh: () => Promise<unknown> }) {
  const { userId } = useAuth();
  const [tab, setTab] = useState<"diff" | "history" | "review">("diff");
  const [selected, setSelected] = useState<{ id: string; ordinal: number }>();
  const [closed, setClosed] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [problem, setProblem] = useState("");
  const [close, { loading }] = useMutation<{ closeMaterialChange: Pick<MaterialChange, "id" | "status"> | null },
    { id: string }>(CLOSE_MATERIAL_CHANGE_MUTATION, { fetchPolicy: "no-cache" });
  const author = useQuery<{ userProfile: { id: string; username: string } | null }>(CHANGE_AUTHOR_QUERY, {
    variables: { id: change.authorId }, skip: !isMaterialID(change.authorId),
  });
  const status = closed ? "closed" : change.status;
  const ownOpen = userId === change.authorId && status === "open";
  const revision = selected ?? change.head;
  const username = author.data?.userProfile?.id === change.authorId ? author.data.userProfile.username : "";

  async function closeProposal() {
    if (!ownOpen || loading) return;
    setProblem("");
    try {
      const { data } = await close({ variables: { id: change.id } });
      const result = data?.closeMaterialChange;
      if (result?.id !== change.id || result.status !== "closed") throw new Error("Invalid close response");
      setClosed(true);
      setConfirm(false);
    } catch {
      setProblem("Не удалось закрыть предложение.");
    }
  }

  return <>
    <header className="page-heading change-heading">
      <div>
        <span className="section-kicker">Материал</span>
        <h1>Предложение правки</h1>
        {change.head.message && <p>{change.head.message}</p>}
        <div className="material-meta">
          <span className="badge">{statusLabels[status]}</span>
          {isMaterialID(change.authorId) && <Link to={`/users/${change.authorId}`}>{username || "Автор предложения"}</Link>}
          <time dateTime={change.createdAt}>{materialDate(change.createdAt)}</time>
        </div>
      </div>
      {ownOpen && <div className="change-actions">
        <Link className="button button--primary" to={`${changeHref(change.id)}/edit`}>
          <GitCommitHorizontal size={16} aria-hidden="true" /> Новая версия
        </Link>
        {!confirm && <button type="button" className="button button--ghost" onClick={() => setConfirm(true)}>
          <GitPullRequestClosed size={16} aria-hidden="true" /> Закрыть
        </button>}
      </div>}
    </header>
    {ownOpen && confirm && <div className="change-confirm">
      <strong>Закрыть предложение?</strong>
      <button type="button" className="button button--danger" disabled={loading} onClick={() => void closeProposal()}>Закрыть предложение</button>
      <button type="button" className="button button--ghost" disabled={loading} onClick={() => { setConfirm(false); setProblem(""); }}>Отмена</button>
      {problem && <p role="alert">{problem}</p>}
    </div>}
    {change.baseOutdated && status === "open" && <div className="change-actions">
      <p role="status">Основание предложения больше не является текущей публикацией.</p>
      {ownOpen && tab !== "review" && <Link className="button button--ghost" to={`${changeHref(change.id)}/rebase`}>Обновить основу</Link>}
    </div>}
    <div className="change-tabs" role="group" aria-label="Раздел предложения">
      <button type="button" className="button button--ghost" aria-pressed={tab === "diff"} onClick={() => setTab("diff")}>Изменения</button>
      <button type="button" className="button button--ghost" aria-pressed={tab === "history"} onClick={() => setTab("history")}>История версий</button>
      <button type="button" className="button button--ghost" aria-pressed={tab === "review"} onClick={() => setTab("review")}>Ревью</button>
    </div>
    {tab === "diff" ? <>
      <div className="change-comparison">
        <h2>Основание и версия {revision.ordinal}</h2>
        {selected && selected.id !== change.head.id &&
          <button type="button" className="button button--ghost" onClick={() => setSelected(undefined)}>Текущая версия</button>}
      </div>
      <ChangeDiff key={revision.id} id={change.id} revisionId={revision.id} />
    </> : tab === "history" ? <ChangeHistory id={change.id} select={(id, ordinal) => { setSelected({ id, ordinal }); setTab("diff"); }} /> :
      <Suspense fallback={<Spinner label="Загружаем ревью" />}>
        <ChangeReview key={revision.id} change={change} proposalStatus={status} revision={revision} refresh={refresh}
          selectCurrent={selected && selected.id !== change.head.id ? () => setSelected(undefined) : undefined} />
      </Suspense>}
  </>;
}
