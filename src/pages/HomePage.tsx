import { useQuery } from "@apollo/client";
import { ArrowRight, BookOpen, Building2, GraduationCap, Radio, Tags } from "lucide-react";
import { Link } from "react-router-dom";
import { FEED_QUERY, type FeedConnection } from "../api/feed";
import { IT_TASKS_QUERY, type ITTaskList } from "../api/tasks";
import { getErrorMessage } from "../api/errors";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Spinner } from "../components/common/Spinner";

const catalogLinks = [
  { to: "/universities", label: "Университеты", note: "Учебные заведения", icon: Building2 },
  { to: "/programs", label: "Программы", note: "Направления и факультеты", icon: GraduationCap },
  { to: "/courses", label: "Курсы", note: "Курсы внутри программ", icon: BookOpen },
  { to: "/topics", label: "Темы", note: "Структура знаний", icon: Tags },
];

// HomePage — тихая стартовая страница: разделы каталога, рекомендуемые задачи
// и лента событий. Никаких hero-блоков и декоративной статистики.
export function HomePage() {
  const { data, loading, error } = useQuery<{ itTasks: ITTaskList }>(IT_TASKS_QUERY, {
    variables: { filter: {}, pagination: { limit: 8, offset: 0 } },
    fetchPolicy: "cache-and-network",
  });
  const tasks = data?.itTasks.items ?? [];

  const feedQuery = useQuery<{ feed: FeedConnection }>(FEED_QUERY, {
    variables: { pagination: { limit: 8, offset: 0 } },
    fetchPolicy: "cache-and-network",
  });
  const feedItems = feedQuery.data?.feed.items ?? [];
  const feedError = feedQuery.error;

  return <main className="page-shell home-page">
    <header className="page-heading">
      <div>
        <span className="section-kicker">Overmindv</span>
        <h1>Практика и каталог</h1>
        <p>Задачи по программированию, курсы и материалы университетской программы — собранные в одном месте.</p>
      </div>
    </header>

    <nav className="entity-shortcuts" aria-label="Каталог">
      {catalogLinks.map(({ to, label, note }) => (
        <Link key={to} to={to}>
          <span className="entity-shortcuts__label"><strong>{label}</strong><small>{note}</small></span>
          <ArrowRight size={16} />
        </Link>
      ))}
    </nav>

    <div className="home-layout">
      <section className="home-tasks">
        <div className="section-title"><div><span className="section-kicker">Рекомендации</span><h2>Задачи для вас</h2></div><span className="section-title__count">{tasks.length}</span></div>
        {error && <ErrorMessage message={getErrorMessage(error)} />}
        {loading && !data
          ? <div className="content-state"><Spinner label="Загружаем задачи…" /></div>
          : tasks.length === 0
            ? <div className="content-state"><BookOpen size={22} /><strong>Задач пока нет</strong><p>Опубликованные задачи появятся здесь.</p></div>
            : <div className="recommendation-list">{tasks.map((task, index) => (
                <Link className="recommendation-row" key={task.id} to={`/tasks/${task.id}`}>
                  <span className="recommendation-row__index">{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{task.title}</strong><p>{difficultyLabel(task.difficulty)} <span className="difficulty-dot" data-difficulty={task.difficulty} aria-hidden="true" /> · {typeLabel(task.taskType)}</p></div>
                  <ArrowRight size={16} />
                </Link>
              ))}</div>}
      </section>

      <aside className="activity-feed">
        <div className="section-title"><div><span className="section-kicker">События</span><h2>Новости</h2></div><Radio size={16} /></div>
        {feedError && <ErrorMessage message={getErrorMessage(feedError)} />}
        {feedQuery.loading && !feedQuery.data
          ? <div className="content-state"><Spinner label="Загружаем ленту…" /></div>
          : feedItems.length === 0
            ? <div className="activity-empty"><span className="activity-pulse" /><strong>Лента готовится</strong><p>Новые задачи, курсы и изменения появятся здесь.</p></div>
            : <div className="feed-list">{feedItems.map((item) => (
                <Link className="feed-row" key={item.id} to={item.href}><strong>{item.title}</strong><small>{item.text || feedKindLabel(item.kind)}</small></Link>
              ))}</div>}
      </aside>
    </div>
  </main>;
}

function difficultyLabel(value: string) { return value === "easy" ? "Начальная" : value === "medium" ? "Средняя" : "Сложная"; }
function typeLabel(value: string) { return value === "programming" ? "Программирование" : value === "single_choice" ? "Один ответ" : "Несколько ответов"; }
function feedKindLabel(kind: string) { return kind === "task_published" ? "Новая задача в ленте" : "Обновление каталога"; }
