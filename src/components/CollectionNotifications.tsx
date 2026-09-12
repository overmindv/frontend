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
  // Локально скрытые, но НЕ прочитанные уведомления. Прочитанным становится только то,
  // на которое кликнули (переход к деталям); остальные на время сессии просто прячем.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const jobs = data?.taskCollectionJobs.items ?? [];
  if (!isAdmin || jobs.length === 0) return null;

  const markRead = async (id: string) => {
    try {
      await acknowledge({ variables: { id } });
    } catch {
      // Уведомление просто останется непрочитанным, ничего не роняем.
    }
    await refetch();
  };

  const dismiss = (id: string) => setDismissedIds((current) => {
    const next = new Set(current);
    next.add(id);
    return next;
  });

  const visibleJobs = jobs.filter((job) => !dismissedIds.has(job.id));
  if (visibleJobs.length === 0) return null;

  return <aside className="toast-stack" aria-live="polite">{visibleJobs.map((job) => <CollectionToast key={job.id} job={job} onOpen={() => void markRead(job.id)} onDismiss={() => dismiss(job.id)} />)}</aside>;
}

// CollectionToast сам управляет таймером автозакрытия и плавным исчезанием:
// — через 5 секунд без наведения уведомление плавно гаснет и скрывается локально (без прочтения);
// — наведение возвращает его на 100% и сбрасывает отсчёт;
// — клик по телу ведёт на детали сбора и помечает уведомление прочитанным, крестик скрывает сразу.
function CollectionToast({ job, onOpen, onDismiss }: { job: TaskCollectionJob; onOpen: () => void; onDismiss: () => void }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  // Храним актуальные колбэки в ref, чтобы таймеры не сбрасывались при ре-рендерах от poll.
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
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
      // Скрываем локально уже после завершения fade, НЕ помечая прочитанным.
      closeTimerRef.current = window.setTimeout(() => onDismissRef.current(), FADE_MS);
    }, AUTO_DISMISS_MS);
  }, [clearTimers]);

  useEffect(() => {
    scheduleHide();
    return clearTimers;
  }, [scheduleHide, clearTimers]);

  const handleMouseEnter = () => {
    // Отменяем и отсчёт, и финальное скрытие, возвращаем на 100%.
    clearTimers();
    setVisible(true);
  };

  const handleMouseLeave = () => {
    setVisible(true);
    scheduleHide();
  };

  const open = () => {
    clearTimers();
    // Клик — единственное действие, которое помечает уведомление прочитанным.
    onOpenRef.current();
    navigate(`/admin/collected-tasks?job=${job.id}`);
  };

  const dismissNow = () => {
    clearTimers();
    onDismissRef.current();
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
      <button aria-label="Закрыть уведомление" className="text-button collection-toast__close" type="button" onClick={dismissNow}>×</button>
    </article>
  );
}
