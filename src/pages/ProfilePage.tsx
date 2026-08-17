import { useQuery } from "@apollo/client";
import { Code2, Settings, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { GET_USER_QUERY } from "../api/queries";
import { MY_IT_CODE_SUBMISSIONS_QUERY, MY_IT_SUBMISSIONS_QUERY, type ITCodeSubmission, type ITSubmission } from "../api/tasks";
import type { User } from "../api/types";
import { Profile } from "../components/Profile/Profile";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Spinner } from "../components/common/Spinner";
import { useAuth } from "../context/AuthContext";

// ProfilePage показывает публичную часть профиля и попытки владельца.
export function ProfilePage() {
  const { userId } = useAuth();

  return <UserProfile userID={userId ?? ""} own />;
}

// PublicUserProfilePage открывает безопасное представление другого пользователя.
export function PublicUserProfilePage() {
  const { id = "" } = useParams();

  return <UserProfile userID={id} own={false} />;
}

// ProfileSettingsPage сохраняет существующую форму редактирования на отдельном маршруте.
export function ProfileSettingsPage() {
  return <main className="page-shell settings-page"><header className="page-heading"><div><span className="section-kicker">Профиль</span><h1>Настройки</h1><p>Основная информация аккаунта</p></div><Settings size={28} /></header><Profile /></main>;
}

function UserProfile({ userID, own }: { userID: string; own: boolean }) {
  const user = useQuery<{ getUser: User }>(GET_USER_QUERY, { variables: { id: userID }, skip: !userID });
  const answers = useQuery<{ myITSubmissions: { items: ITSubmission[] } }>(MY_IT_SUBMISSIONS_QUERY, { variables: { taskId: null, pagination: { limit: 20, offset: 0 } }, skip: !own });
  const code = useQuery<{ myITCodeSubmissions: { items: ITCodeSubmission[] } }>(MY_IT_CODE_SUBMISSIONS_QUERY, { variables: { taskId: null, pagination: { limit: 20, offset: 0 } }, skip: !own });
  const profile = user.data?.getUser;

  if (user.loading && !profile) return <main className="page-shell content-state"><Spinner label="Загружаем профиль…" /></main>;
  if (user.error || !profile) return <main className="page-shell"><ErrorMessage message={user.error?.message ?? "Профиль не найден"} /></main>;

  const attempts = [
    ...(answers.data?.myITSubmissions.items ?? []).map((item) => ({ id: item.id, taskId: item.taskId, date: item.createdAt, verdict: item.verdict, detail: `Тест · версия ${item.taskVersionNumber}`, href: `/history/${item.id}` })),
    ...(code.data?.myITCodeSubmissions.items ?? []).map((item) => ({ id: item.id, taskId: item.taskId, date: item.createdAt, verdict: item.verdict ?? item.status, detail: `${item.language === "python" ? "Python" : "Go"} · файл ${item.sourceFileName}`, href: `/tasks/${item.taskId}` })),
  ].sort((left, right) => right.date.localeCompare(left.date));
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.username;

  return <main className="page-shell user-profile-page"><section className="profile-hero"><aside className="profile-identity"><div className="profile-avatar"><span>{displayName.slice(0, 1).toUpperCase()}</span><small>Аватар не загружен</small></div><dl><div><dt>На платформе</dt><dd>с {formatDate(profile.createdAt)}</dd></div><div><dt>Роль</dt><dd>{profile.isSuperuser ? "Суперпользователь" : profile.isAdmin ? "Администратор" : "Пользователь"}</dd></div><div><dt>О себе</dt><dd>Информация не добавлена</dd></div></dl></aside><div className="profile-main"><header><div><span className="section-kicker">Профиль</span><h1>{displayName}</h1><p>@{profile.username}</p></div>{own && <Link className="header-icon profile-settings-link" to="/profile/settings" aria-label="Настройки профиля"><Settings size={20} /></Link>}</header>{own && <div className="profile-private"><span>{profile.email}</span>{profile.phone && <span>{profile.phone}</span>}</div>}<section className="attempts-section"><div className="section-title"><div><span className="section-kicker">Решения</span><h2>Последние попытки</h2></div><Code2 size={19} /></div>{(answers.loading || code.loading) && attempts.length === 0 ? <div className="content-state"><Spinner label="Загружаем попытки…" /></div> : !own ? <div className="content-state content-state--compact"><UserRound size={25} /><strong>История решений скрыта</strong><p>Публичная история появится после настройки правил доступа.</p></div> : attempts.length === 0 ? <div className="content-state content-state--compact"><Code2 size={25} /><strong>Попыток пока нет</strong><p>Откройте задачу и отправьте первое решение.</p></div> : <div className="attempt-list">{attempts.map((attempt) => <Link className="attempt-row" key={`${attempt.detail}-${attempt.id}`} to={attempt.href}><span className={`verdict-dot${attempt.verdict === "accepted" ? " is-accepted" : attempt.verdict === "queued" ? " is-queued" : " is-wrong"}`} /><div><strong>Задача {attempt.taskId.slice(0, 8)}</strong><p>{attempt.detail}</p></div><div><strong>{verdictLabel(attempt.verdict)}</strong><p>{formatDateTime(attempt.date)}</p></div></Link>)}</div>}</section></div></section></main>;
}

function verdictLabel(value: string) { return value === "accepted" ? "Принято" : value === "queued" ? "В очереди" : value === "completed" ? "Проверено" : "Ошибка"; }
function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
