import { useQuery } from "@apollo/client";
import { ArrowUpRight, Trophy, UsersRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PRACTICE_LEADERBOARD_QUERY, RATING_COURSES_QUERY, type PracticeLeaderboardEntry } from "../api/progress";
import { getErrorMessage } from "../api/errors";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Spinner } from "../components/common/Spinner";
import { useAuth } from "../context/AuthContext";

type CourseOption = { id: string; name: string; status: string };

export function LeaderboardPage() {
  const { userId } = useAuth();
  const [scope, setScope] = useState<"global" | "course">("global");
  const [courseId, setCourseId] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const courses = useQuery<{ courses: CourseOption[] }>(RATING_COURSES_QUERY, {
    variables: { search: courseSearch }, skip: scope !== "course", fetchPolicy: "network-only",
  });
  const rating = useQuery<{ practiceLeaderboard: PracticeLeaderboardEntry[] }>(PRACTICE_LEADERBOARD_QUERY, {
    variables: { courseId: scope === "course" ? courseId || null : null },
    skip: scope === "course" && !courseId, fetchPolicy: "network-only",
  });
  const rows = rating.data?.practiceLeaderboard ?? [];

  return <main className="page-shell rating-page">
    <header className="rating-hero">
      <div><span className="section-kicker">Сообщество</span><h1>Рейтинг практики</h1><p>Смотрите, как продвигаются участники, которые открыли свою статистику. Выберите весь каталог или отдельный курс.</p></div>
      <Trophy size={42} aria-hidden="true" />
    </header>
    <section className="rating-explanation" aria-label="Как считаются очки">
      <strong>Очки за первую успешную попытку задачи</strong>
      <p>10 за начальную · 20 за среднюю · 30 за сложную. Повторные решения не добавляют очков. Это активность в задачах, а не оценка знаний.</p>
    </section>
    <div className="rating-scope" aria-label="Вид рейтинга">
      <button className={scope === "global" ? "is-active" : ""} type="button" aria-pressed={scope === "global"} onClick={() => setScope("global")}>Общий</button>
      <button className={scope === "course" ? "is-active" : ""} type="button" aria-pressed={scope === "course"} onClick={() => setScope("course")}>По курсу</button>
    </div>
    {scope === "course" && <div className="rating-course-picker">
      <label className="field"><span>Найти курс</span><input type="search" value={courseSearch} onChange={(event) => setCourseSearch(event.target.value)} placeholder="Название курса" /></label>
      <label className="field"><span>Курс</span><select aria-label="Курс" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
        <option value="">Выберите курс</option>
        {(courses.data?.courses ?? []).map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
      </select></label>
      {courses.loading && <small role="status">Ищем курсы…</small>}
      {courses.error && <ErrorMessage message={getErrorMessage(courses.error)} />}
    </div>}
    {scope === "course" && !courseId ? <div className="content-state content-state--compact"><UsersRound size={24} /><strong>Выберите курс</strong><p>Покажем участников, решавших задачи по темам этого курса.</p></div>
      : rating.loading && !rating.data ? <div className="content-state"><Spinner label="Загружаем рейтинг…" /></div>
        : rating.error ? <div className="content-state"><ErrorMessage message={getErrorMessage(rating.error)} /><button className="button" type="button" onClick={() => { void rating.refetch().catch(() => undefined); }}>Повторить</button></div>
          : rows.length === 0 ? <div className="content-state content-state--compact"><Trophy size={24} /><strong>Пока нет участников</strong><p>Рейтинг появится, когда участники откроют статистику и решат задачу.</p></div>
            : <section className="rating-table-section" aria-label="Участники рейтинга">
              <div className="rating-table-heading"><h2>Участники</h2><span>Топ {rows.length}</span></div>
              <div className="rating-table-scroll"><table className="rating-table"><thead><tr><th scope="col">Место</th><th scope="col">Участник</th><th scope="col">Решено</th><th scope="col">Очки</th><th scope="col">Сравнение</th></tr></thead><tbody>
                {rows.map((row) => <tr key={row.userId} className={row.userId === userId ? "is-me" : ""}>
                  <td><span className={`rating-rank${row.rank <= 3 ? " rating-rank--top" : ""}`}>{row.rank}</span></td>
                  <td><Link className="rating-person" to={`/users/${row.userId}`}><span className="rating-person__avatar" aria-hidden="true">{row.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{row.displayName}</strong><small>@{row.username}{row.userId === userId ? " · вы" : ""}</small></span></Link></td>
                  <td>{row.solvedTasks}</td><td><strong>{row.score.toLocaleString("ru-RU")}</strong></td>
                  <td>{row.userId === userId ? <span className="rating-muted">—</span> : <Link className="text-link" to={`/compare/${row.userId}`}>Сравнить <ArrowUpRight size={14} aria-hidden="true" /></Link>}</td>
                </tr>)}
              </tbody></table></div>
            </section>}
    <p className="progress-explainer">В таблице только пользователи, которые сами открыли статистику. Можно закрыть её в своём профиле в любой момент.</p>
  </main>;
}
