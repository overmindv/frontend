import { useQuery } from "@apollo/client";
import { ArrowLeftRight, LockKeyhole } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { MY_PROGRESS_QUERY, USER_PROGRESS_QUERY, type PracticeProgress } from "../api/progress";
import { PUBLIC_USER_QUERY } from "../api/queries";
import type { PublicUser } from "../api/types";
import { getErrorMessage } from "../api/errors";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Spinner } from "../components/common/Spinner";
import { ProgressOverview } from "../components/progress/ProgressOverview";

export function ComparePage() {
  const { id = "" } = useParams();
  const mine = useQuery<{ myPracticeProgress: PracticeProgress }>(MY_PROGRESS_QUERY, { fetchPolicy: "network-only" });
  const peer = useQuery<{ practiceProgress: PracticeProgress | null }>(USER_PROGRESS_QUERY, { variables: { userId: id }, skip: !id, fetchPolicy: "network-only" });
  const profile = useQuery<{ userProfile: PublicUser }>(PUBLIC_USER_QUERY, { variables: { id }, skip: !id });
  const own = mine.data?.myPracticeProgress;
  const other = peer.data?.practiceProgress;
  const otherName = profile.data?.userProfile ? [profile.data.userProfile.firstName, profile.data.userProfile.lastName].filter(Boolean).join(" ") || profile.data.userProfile.username : "Другой участник";
  const values = own && other ? [
    ["Очки практики", own.score, other.score],
    ["Уникально решено задач", own.solvedTasks, other.solvedTasks],
    ["Проверенных попыток", own.attempts, other.attempts],
    ["Доля успешных попыток", `${own.accuracyPercent}%`, `${other.accuracyPercent}%`],
    ["Попыток за 30 дней", own.daily.reduce((sum, day) => sum + day.attempts, 0), other.daily.reduce((sum, day) => sum + day.attempts, 0)],
  ] : [];

  return <main className="page-shell compare-page">
    <header className="page-heading compare-heading"><div><span className="section-kicker">Сообщество</span><h1>Сравнение практики</h1><p>Одинаковые показатели и период для вас и другого участника.</p></div><ArrowLeftRight size={32} aria-hidden="true" /></header>
    <nav className="compare-links" aria-label="Навигация сравнения"><Link className="text-link" to="/leaderboard">← К рейтингу</Link><Link className="text-link" to={`/users/${id}`}>Профиль участника</Link></nav>
    {(mine.loading || peer.loading || profile.loading) && (!own || !peer.data || !profile.data) && <div className="content-state"><Spinner label="Загружаем сравнение…" /></div>}
    {(mine.error || peer.error || profile.error) && <ErrorMessage message={getErrorMessage(mine.error ?? peer.error ?? profile.error)} />}
    {!peer.loading && !peer.error && peer.data && !other && <div className="content-state content-state--compact"><LockKeyhole size={26} /><strong>Статистика закрыта</strong><p>Этот участник не открыл свою статистику для сравнения.</p></div>}
    {own && other && profile.data?.userProfile && <>
      <div className="compare-grid">
        <section className="compare-person" aria-label="Ваш прогресс"><h2>Вы</h2><ProgressOverview progress={own} /></section>
        <section className="compare-person" aria-label={`Прогресс ${otherName}`}><h2>{otherName}</h2><ProgressOverview progress={other} /></section>
      </div>
      <section className="compare-table-section"><h2>Показатели рядом</h2><div className="rating-table-scroll"><table className="rating-table compare-table" aria-label="Сравнение показателей"><thead><tr><th scope="col">Показатель</th><th scope="col">Вы</th><th scope="col">{otherName}</th></tr></thead><tbody>
        {values.map(([label, ownValue, otherValue]) => <tr key={label}><th scope="row">{label}</th><td>{ownValue}</td><td>{otherValue}</td></tr>)}
      </tbody></table></div></section>
    </>}
  </main>;
}
