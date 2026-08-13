import { useMutation, useQuery } from "@apollo/client";
import { Link } from "react-router-dom";
import { ACKNOWLEDGE_COLLECTION_JOB, COLLECTION_JOBS_QUERY, type TaskCollectionJob } from "../api/collection";
import { useAuth } from "../context/AuthContext";

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
    await acknowledge({ variables: { id } });
    await refetch();
  };

  return <aside className="toast-stack" aria-live="polite">{jobs.map((job) => <article className="collection-toast" key={job.id}><button aria-label="Закрыть уведомление" className="text-button" onClick={() => void close(job.id)}>×</button><strong>{job.status === "succeeded" ? "Сбор завершён" : job.status === "partial" ? "Сбор завершён частично" : "Сбор не выполнен"}</strong><span>{job.importedTotal} новых · {job.duplicatesTotal} дублей · {job.errorCount} ошибок</span><Link to={`/admin/collected-tasks?job=${job.id}`} onClick={() => void close(job.id)}>Открыть детали →</Link></article>)}</aside>;
}
