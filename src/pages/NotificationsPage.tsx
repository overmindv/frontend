import { useMutation, useQuery } from "@apollo/client";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ACKNOWLEDGE_COLLECTION_JOB, COLLECTION_JOBS_QUERY, type TaskCollectionJob, type TaskCollectionJobStatus } from "../api/collection";
import { getErrorMessage } from "../api/errors";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Spinner } from "../components/common/Spinner";
import { useAuth } from "../context/AuthContext";

type StatusFilter = "all" | TaskCollectionJobStatus;
type UnreadFilter = "all" | "unread" | "read";

const STATUS_OPTIONS: Array<[StatusFilter, string]> = [
  ["all", "Все статусы"], ["succeeded", "Сбор завершён"], ["partial", "Сбор завершён частично"], ["failed", "Сбор не выполнен"],
];

const UNREAD_OPTIONS: Array<[UnreadFilter, string]> = [
  ["all", "Все"], ["unread", "Непрочитанные"], ["read", "Прочитанные"],
];

// NotificationsPage — все уведомления о сборе задач с фильтрами по статусу и прочтению.
export function NotificationsPage() {
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [unread, setUnread] = useState<UnreadFilter>("all");
  const { data, loading, error, refetch } = useQuery<{ taskCollectionJobs: { items: TaskCollectionJob[] } }>(
    COLLECTION_JOBS_QUERY,
    { variables: { unreadOnly: false, pagination: { limit: 200, offset: 0 } }, skip: !isAdmin, fetchPolicy: "cache-and-network" },
  );
  const [acknowledge] = useMutation(ACKNOWLEDGE_COLLECTION_JOB);

  const jobs = useMemo(() => {
    const items = data?.taskCollectionJobs.items ?? [];
    return items.filter((job) =>
      (status === "all" || job.status === status) &&
      (unread === "all" || (unread === "unread" ? !job.notificationAcknowledged : job.notificationAcknowledged)),
    );
  }, [data, status, unread]);

  if (!isAdmin) return <Denied />;

  const markRead = async (id: string) => {
    await acknowledge({ variables: { id } });
    await refetch();
  };

  return (
    <main className="page-shell catalog notifications-page">
      <header className="section-heading">
        <div><span className="eyebrow">Уведомления</span><h1>Сбор задач</h1></div>
        <p>История уведомлений о загрузке задач. Непрочитанные подсвечиваются — откройте, чтобы принять решение о публикации.</p>
      </header>

      <div className="inline-form notifications-page__filters">
        <label className="field"><span>Статус</span><select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field"><span>Прочитано</span><select value={unread} onChange={(event) => setUnread(event.target.value as UnreadFilter)}>{UNREAD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>

      <section className="panel">
        <h2>Список уведомлений {jobs.length ? <span className="notifications-page__count">{jobs.length}</span> : null}</h2>
        {error && <ErrorMessage message={getErrorMessage(error)} />}
        {loading && !data ? <Spinner label="Загружаем уведомления…" /> : jobs.length === 0 ? (
          <div className="empty-state"><span>00</span><h2>Пусто</h2><p>По выбранным фильтрам уведомлений нет.</p></div>
        ) : <div className="catalog-list">{jobs.map((job) => {
          const title = job.status === "succeeded" ? "Сбор завершён" : job.status === "partial" ? "Сбор завершён частично" : "Сбор не выполнен";
          const unread = !job.notificationAcknowledged;
          return (
            <article className={`catalog-row notifications-page__row${unread ? " notifications-page__row--unread" : ""}`} key={job.id}>
              <div>
                <strong className="notifications-page__title">{unread && <span aria-hidden="true" className="notifications-page__dot" />}{title}</strong>
                <p>{formatDate(job.createdAt)} · {job.trigger === "manual" ? "ручной сбор" : "плановый сбор"}{job.requestedBy ? ` · инициатор ${job.requestedBy.slice(0, 8)}` : ""}</p>
                <div className="notifications-page__details"><span className="status-tag">{unread ? "Не прочитано" : "Прочитано"}</span><span>Новых: {job.importedTotal}</span><span>Дублей: {job.duplicatesTotal}</span><span>Ошибок: {job.errorCount}</span></div>
              </div>
              <div className="notifications-page__actions">
                <Link className="text-link" to={`/admin/collected-tasks?job=${job.id}`}>Открыть детали →</Link>
                {unread && <button className="text-button" type="button" onClick={() => void markRead(job.id)}>Отметить прочитанным</button>}
              </div>
            </article>
          );
        })}</div>}
      </section>
    </main>
  );
}

function Denied() { return <main className="page-shell panel"><h1>Недостаточно прав</h1><p>Раздел доступен администраторам.</p></main>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
