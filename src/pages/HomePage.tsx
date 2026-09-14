import { useQuery } from "@apollo/client";
import { ArrowRight, BookOpen, Building2, Flame, GraduationCap, Radio, Sparkles, Tags } from "lucide-react";
import { Link } from "react-router-dom";
import { FEED_QUERY, type FeedConnection } from "../api/feed";
import { IT_TASKS_QUERY, type ITTaskList } from "../api/tasks";
import { getErrorMessage } from "../api/errors";
import { AnimatedNumber } from "../components/common/AnimatedNumber";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Reveal } from "../components/common/Reveal";
import { Spinner } from "../components/common/Spinner";

const catalogLinks = [
  { to: "/universities", label: "Университеты", icon: Building2 },
  { to: "/programs", label: "Программы", icon: GraduationCap },
  { to: "/courses", label: "Курсы", icon: BookOpen },
  { to: "/topics", label: "Темы", icon: Tags },
];

// HomePage показывает тёплое приветствие, живую статистику и подготовленную ленту активности.
export function HomePage() {
  const { data, loading, error } = useQuery<{ itTasks: ITTaskList }>(IT_TASKS_QUERY, {
    variables: { filter: {}, pagination: { limit: 8, offset: 0 } },
    fetchPolicy: "cache-and-network",
  });
  const tasks = data?.itTasks.items ?? [];
  const difficultyCount = new Set(tasks.map((task) => task.difficulty)).size;
  const typeCount = new Set(tasks.map((task) => task.taskType)).size;

  const feedQuery = useQuery<{ feed: FeedConnection }>(FEED_QUERY, {
    variables: { pagination: { limit: 8, offset: 0 } },
    fetchPolicy: "cache-and-network",
  });
  const feedItems = feedQuery.data?.feed.items ?? [];
  const feedError = feedQuery.error;

  return <main className="page-shell home-page">
    <section className="hero">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="hero__inner">
        <Reveal as="header" className="hero__heading">
          <span className="hero__kicker"><Sparkles size={15} /> Overmindv · практика в собственном темпе</span>
          <h1>Продолжайте <span className="gradient-text">практику</span><br />каждый день</h1>
          <p>Тёплое место, где вы решаете задачи по программированию, закрепляете теорию и <span className="text-hand">растёте помаленьку</span> — без давления и жёстких сроков.</p>
          <div className="hero__cta">
            <Link className="button button--primary button--lg" to="/tasks">Начать практику <ArrowRight size={18} /></Link>
            <Link className="button button--ghost button--lg" to="/universities">Смотреть каталог</Link>
          </div>
        </Reveal>
        <Reveal className="hero__stats" delayMs={120}>
          <div className="stat"><span className="stat__icon"><Flame size={18} /></span><AnimatedNumber className="stat__value" value={tasks.length} suffix="" /><span className="stat__label">задач перед вами</span></div>
          <div className="stat"><span className="stat__icon"><BookOpen size={18} /></span><AnimatedNumber className="stat__value" value={difficultyCount} /><span className="stat__label">уровней сложности</span></div>
          <div className="stat"><span className="stat__icon"><Sparkles size={18} /></span><AnimatedNumber className="stat__value" value={typeCount} /><span className="stat__label">формата задач</span></div>
        </Reveal>
      </div>
    </section>

    <Reveal as="nav" className="entity-shortcuts" aria-label="Каталог">{catalogLinks.map(({ to, label, icon: Icon }) => <Link key={to} to={to}><span className="entity-shortcuts__icon"><Icon size={19} /></span><span className="entity-shortcuts__label"><strong>{label}</strong><small>Открыть раздел</small></span><ArrowRight size={16} /></Link>)}</Reveal>

    <div className="home-layout">
      <Reveal as="section" className="home-tasks"><div className="section-title"><div><span className="section-kicker">Рекомендуемые задачи</span><h2>Задачи для вас</h2></div><span className="section-badge">{tasks.length}</span></div>
        {error && <ErrorMessage message={getErrorMessage(error)} />}
        {loading && !data ? <div className="content-state"><Spinner label="Загружаем задачи…" /></div> : tasks.length === 0 ? <div className="content-state"><BookOpen size={28} /><strong>Задач пока нет</strong><p>Опубликованные задачи появятся здесь.</p></div> : <div className="recommendation-list">{tasks.map((task, index) => <Link className="recommendation-row" key={task.id} to={`/tasks/${task.id}`}><span className="recommendation-row__index">{String(index + 1).padStart(2, "0")}</span><div><strong>{task.title}</strong><p>{difficultyLabel(task.difficulty)} <span className="difficulty-dot" data-difficulty={task.difficulty} aria-hidden="true" /> · {typeLabel(task.taskType)}</p></div><ArrowRight size={18} /></Link>)}</div>}
      </Reveal>
      <Reveal as="aside" className="activity-feed"><div className="section-title"><div><span className="section-kicker">События</span><h2>Новости</h2></div><Radio size={18} /></div>
        {feedError && <ErrorMessage message={getErrorMessage(feedError)} />}
        {feedQuery.loading && !feedQuery.data ? <div className="content-state"><Spinner label="Загружаем ленту…" /></div> : feedItems.length === 0 ? <div className="activity-empty"><span className="activity-pulse" /><strong>Лента готовится</strong><p>Новые задачи, курсы и изменения появятся здесь.</p></div> : <div className="feed-list">{feedItems.map((item) => <Link className="feed-row" key={item.id} to={item.href}><strong>{item.title}</strong><small>{item.text || feedKindLabel(item.kind)}</small></Link>)}</div>}
      </Reveal>
    </div>
  </main>;
}

function difficultyLabel(value: string) { return value === "easy" ? "Начальная" : value === "medium" ? "Средняя" : "Сложная"; }
function typeLabel(value: string) { return value === "programming" ? "Программирование" : value === "single_choice" ? "Один ответ" : "Несколько ответов"; }
function feedKindLabel(kind: string) { return kind === "task_published" ? "Новая задача в ленте" : "Обновление каталога"; }
