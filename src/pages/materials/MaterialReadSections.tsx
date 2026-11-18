import { useQuery } from "@apollo/client";
import { ArrowRight, History } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { MATERIAL_HISTORY_QUERY, isMaterialID, materialDate, type MaterialHistoryResult } from "../../api/materials";
import { IT_TASKS_QUERY, type ITTaskList } from "../../api/tasks";
import { Spinner } from "../../components/common/Spinner";

export function MaterialHistory({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [before, setBefore] = useState<number | null>(null);
  const { data, error, loading } = useQuery<MaterialHistoryResult>(MATERIAL_HISTORY_QUERY, {
    variables: { id, before },
    skip: !open,
    fetchPolicy: "no-cache",
  });
  const page = data?.materialRevisions;

  return <details className="material-aside-section material-history" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary><History size={16} aria-hidden="true" /> История версий</summary>
    {open && (loading ? <Spinner label="Загружаем историю" /> :
      error || !page ? <p role="status">История недоступна.</p> :
        page.items.length === 0 ? <p>Нет версий на этой странице.</p> : <ol>
          {page.items.map((item) => <li key={item.id}>
            <strong>Версия {item.number}</strong>
            <time dateTime={item.createdAt}>{materialDate(item.createdAt)}</time>
            {item.message && <p>{item.message}</p>}
          </li>)}
        </ol>)}
    {open && !loading && !error && <div className="material-pagination">
      {before !== null && <button className="button button--ghost" type="button" onClick={() => setBefore(null)}>В начало</button>}
      {page && page.nextBeforeRevision !== null && <button className="button button--ghost" type="button" onClick={() => setBefore(page.nextBeforeRevision)}>
        Ранние версии <ArrowRight size={15} aria-hidden="true" />
      </button>}
    </div>}
  </details>;
}

export function MaterialRelatedTasks({ topicId }: { topicId: string }) {
  const { data, error, loading } = useQuery<{ itTasks: ITTaskList }>(IT_TASKS_QUERY, {
    variables: { filter: { topicId }, pagination: { limit: 5, offset: 0 } },
  });
  const items = data?.itTasks.items.filter((task) => isMaterialID(task.id)) ?? [];
  return <section className="material-aside-section">
    <h2>Практика по теме</h2>
    {loading ? <Spinner label="Загружаем задачи" /> :
      error ? <p role="status">Задачи временно недоступны.</p> :
        !items.length ? <p>По этой теме пока нет задач.</p> : <ul className="material-task-list">
          {items.map((task) => <li key={task.id}>
            <Link to={`/tasks/${task.id}`}><span>{task.title}</span><ArrowRight size={15} aria-hidden="true" /></Link>
          </li>)}
        </ul>}
  </section>;
}
