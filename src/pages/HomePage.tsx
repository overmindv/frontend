import { useQuery } from "@apollo/client";
import { ArrowRight, BookOpen, Building2, GraduationCap, Radio, Tags } from "lucide-react";
import { Link } from "react-router-dom";
import { IT_TASKS_QUERY, type ITTaskList } from "../api/tasks";
import { getErrorMessage } from "../api/errors";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Spinner } from "../components/common/Spinner";

const catalogLinks = [
  { to: "/universities", label: "Университеты", icon: Building2 },
  { to: "/programs", label: "Программы", icon: GraduationCap },
  { to: "/courses", label: "Курсы", icon: BookOpen },
  { to: "/topics", label: "Темы", icon: Tags },
];

// HomePage показывает опубликованные задачи и подготовленную ленту активности.
export function HomePage() {
  const { data, loading, error } = useQuery<{ itTasks: ITTaskList }>(IT_TASKS_QUERY, {
    variables: { filter: {}, pagination: { limit: 8, offset: 0 } },
    fetchPolicy: "cache-and-network",
  });
  const tasks = data?.itTasks.items ?? [];

  return <main className="page-shell home-page">
    <header className="home-intro"><div><span className="section-kicker">Главная</span><h1>Продолжайте практику</h1></div><Link className="text-link" to="/tasks">Все задачи <ArrowRight size={16} /></Link></header>
    <nav className="entity-shortcuts" aria-label="Каталог">{catalogLinks.map(({ to, label, icon: Icon }) => <Link key={to} to={to}><Icon size={18} /><span>{label}</span><ArrowRight size={15} /></Link>)}</nav>
    <div className="home-layout">
      <section className="home-tasks"><div className="section-title"><div><span className="section-kicker">Рекомендуемые задачи</span><h2>Задачи для вас</h2></div><span>{tasks.length}</span></div>
        {error && <ErrorMessage message={getErrorMessage(error)} />}
        {loading && !data ? <div className="content-state"><Spinner label="Загружаем задачи…" /></div> : tasks.length === 0 ? <div className="content-state"><BookOpen size={28} /><strong>Задач пока нет</strong><p>Опубликованные задачи появятся здесь.</p></div> : <div className="recommendation-list">{tasks.map((task, index) => <Link className="recommendation-row" key={task.id} to={`/tasks/${task.id}`}><span className="recommendation-row__index">{String(index + 1).padStart(2, "0")}</span><div><strong>{task.title}</strong><p>{difficultyLabel(task.difficulty)} · {typeLabel(task.taskType)}</p></div><ArrowRight size={18} /></Link>)}</div>}
      </section>
      <aside className="activity-feed"><div className="section-title"><div><span className="section-kicker">События</span><h2>Новости</h2></div><Radio size={18} /></div><div className="activity-empty"><span className="activity-pulse" /><strong>Лента готовится</strong><p>Новые задачи, курсы и изменения появятся здесь после подключения журнала событий.</p></div></aside>
    </div>
  </main>;
}

function difficultyLabel(value: string) { return value === "easy" ? "Начальная" : value === "medium" ? "Средняя" : "Сложная"; }
function typeLabel(value: string) { return value === "programming" ? "Программирование" : value === "single_choice" ? "Один ответ" : "Несколько ответов"; }
