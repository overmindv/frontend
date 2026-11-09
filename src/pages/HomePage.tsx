import { useQuery } from "@apollo/client";
import { ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { FEED_QUERY, type FeedConnection } from "../api/feed";
import { IT_TASKS_QUERY, type ITTaskList } from "../api/tasks";
import { getErrorMessage } from "../api/errors";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Spinner } from "../components/common/Spinner";

const catalogLinks = [
  { to: "/universities", label: "Университеты" },
  { to: "/programs", label: "Программы" },
  { to: "/courses", label: "Курсы" },
  { to: "/topics", label: "Темы" },
];

export function HomePage() {
  const { data, loading, error, refetch } = useQuery<{ itTasks: ITTaskList }>(IT_TASKS_QUERY, {
    variables: { filter: {}, pagination: { limit: 8, offset: 0 } },
    fetchPolicy: "cache-and-network",
  });
  const tasks = data?.itTasks.items ?? [];
  const feedQuery = useQuery<{ feed: FeedConnection }>(FEED_QUERY, {
    variables: { pagination: { limit: 8, offset: 0 } },
    fetchPolicy: "cache-and-network",
  });
  const feedItems = feedQuery.data?.feed.items ?? [];

  return <main className="page-shell home-page">
    <header className="page-heading">
      <div><h1>Практика</h1><p>Выберите тему для тренировки или откройте задачу из списка.</p></div>
      <Link className="button button--primary" to="/practice">Практика по темам</Link>
    </header>

    <section className="home-tasks" aria-labelledby="home-tasks-title">
      <div className="section-title"><h2 id="home-tasks-title">Задачи</h2><Link className="text-link" to="/tasks">Все задачи →</Link></div>
      {error ? <div className="content-state"><ErrorMessage message={getErrorMessage(error)} /><button className="button button--ghost" type="button" onClick={() => void refetch().catch(() => undefined)}>Повторить</button></div>
        : loading && !data ? <div className="content-state"><Spinner label="Загружаем задачи…" /></div>
        : tasks.length === 0 ? <div className="content-state"><BookOpen size={22} /><strong>Задач пока нет</strong><p>Опубликованные задачи появятся здесь.</p></div>
        : <div className="recommendation-list">{tasks.map((task) => (
            <Link className="recommendation-row" key={task.id} to={`/tasks/${task.id}`}>
              <div><strong>{task.title}</strong><p>{difficultyLabel(task.difficulty)} · {typeLabel(task.taskType)}</p></div>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ))}</div>}
    </section>

    <nav className="home-catalog" aria-label="Каталог"><span>Каталог</span>{catalogLinks.map(({ to, label }) => <Link className="text-link" key={to} to={to}>{label}</Link>)}</nav>

    {(feedItems.length > 0 || feedQuery.error) && <section className="activity-feed" aria-label="Новости">
      <div className="section-title"><h2>Новости</h2></div>
      {feedQuery.error ? <div className="content-state"><ErrorMessage message={getErrorMessage(feedQuery.error)} /><button className="button button--ghost" type="button" onClick={() => void feedQuery.refetch().catch(() => undefined)}>Повторить загрузку новостей</button></div>
        : <div className="feed-list">{feedItems.map((item) => <Link className="feed-row" key={item.id} to={item.href}><strong>{item.title}</strong><small>{item.text || feedKindLabel(item.kind)}</small></Link>)}</div>}
    </section>}
  </main>;
}

function difficultyLabel(value: string) { return value === "easy" ? "Начальная" : value === "medium" ? "Средняя" : "Сложная"; }
function typeLabel(value: string) { return value === "programming" ? "Программирование" : value === "single_choice" ? "Один ответ" : "Несколько ответов"; }
function feedKindLabel(kind: string) { return kind === "task_published" ? "Новая задача" : "Обновление каталога"; }
