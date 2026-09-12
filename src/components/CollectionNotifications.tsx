import { useMutation, useQuery } from "@apollo/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ACKNOWLEDGE_COLLECTION_JOB, COLLECTION_JOBS_QUERY, type TaskCollectionJob } from "../api/collection";
import { useAuth } from "../context/AuthContext";

// Сколько секунд уведомление видно до начала плавного исчезания.
const AUTO_DISMISS_MS = 5000;
// Длительность плавного исчезания — совпадает с CSS transition у .collection-toast.
const FADE_MS = 300;

// CollectionNotifications опрашивает только непрочитанные terminal manual jobs текущего администратора.
export function CollectionNotifications() {
  const { isAdmin } = useAuth();
  const { data, refetch } = useQuery<{ taskCollectionJobs: { items: TaskCollectionJob[] } }>(COLLECTION_JOBS_QUERY, {
    variables: { unreadOnly: true, pagination: { limit: 10, offset: 0 } },
    skip: !isAdmin,
    pollInterval: 5000,
    fetchPolicy: "network-only",
  });
  const [acknowledge] = useMutation(ACKNOWLEDGE_COLLECTION_JOB);
  const jobs = data?.taskCollectionJobs.items ?? [];
  if (!isAdmin || jobs.length === 0) return null;

  const close = async (id: string) => {
    try {
      await acknowledge({ variables: { id } });
    } catch {
      // Уведомление просто останется видимым, ничего не роняем.
    }
    await refetch();
  };

  return <aside className="toast-stack" aria-live="polite">{jobs.map((job) => <CollectionToast key={job.id} job={job} onClose={() => void close(job.id)} />)}</aside>;
}

// CollectionToast сам управляет таймером автозакрытия и плавным исчезанием:
// — через 5 секунд без наведения уведомление плавно гаснет;
// — наведение возвращает его на 100% и сбрасывает отсчёт;
// — клик по телу ведёт на детали сбора, крестик закрывает сразу.
function CollectionToast({ job, onClose }: { job: TaskCollectionJob; onClose: () => void }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  // Храним актуальный onClose в ref, чтобы таймеры не сбрасывались при ре-рендерах от poll.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const hideTimerRef = useRef<number | undefined>(undefined);
  const closeTimerRef = useRef<number | undefined>(undefined);

  const clearTimers = useCallback(() => {
    window.clearTimeout(hideTimerRef.current);
    window.clearTimeout(closeTimerRef.current);
  }, []);

  const scheduleHide = useCallback(() => {
    clearTimers();
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      // Финально закрываем уже после завершения fade.
      closeTimerRef.current = window.setTimeout(() => onCloseRef.current(), FADE_MS);
    }, AUTO_DISMISS_MS);
  }, [clearTimers]);

  useEffect(() => {
    scheduleHide();
    return clearTimers;
  }, [scheduleHide, clearTimers]);

  const handleMouseEnter = () => {
    // Отменяем и отсчёт, и финальное закрытие, возвращаем на 100%.
    clearTimers();
    setVisible(true);
  };

  const handleMouseLeave = () => {
    setVisible(true);
    scheduleHide();
  };

  const open = () => {
    clearTimers();
    onCloseRef.current();
    navigate(`/admin/collected-tasks?job=${job.id}`);
  };

  return (
    <article className={`collection-toast${visible ? "" : " collection-toast--hiding"}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="collection-toast__body" role="link" tabIndex={0} onClick={open} onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
      }}>
        <strong>{job.status === "succeeded" ? "Сбор завершён" : job.status === "partial" ? "Сбор завершён частично" : "Сбор не выполнен"}</strong>
        <span>{job.importedTotal} новых · {job.duplicatesTotal} дублей · {job.errorCount} ошибок</span>
        <span className="collection-toast__open">Открыть детали →</span>
      </div>
      <button aria-label="Закрыть уведомление" className="text-button collection-toast__close" type="button" onClick={() => { clearTimers(); onCloseRef.current(); }}>×</button>
    </article>
  );
}
