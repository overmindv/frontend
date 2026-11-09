import { useMutation, useQuery } from "@apollo/client";
import { ArrowRight, Code2, Settings, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GET_USER_QUERY, PUBLIC_USER_QUERY } from "../api/queries";
import { MY_IT_CODE_SUBMISSIONS_QUERY, MY_IT_SUBMISSIONS_QUERY, type ITCodeSubmission, type ITSubmission } from "../api/tasks";
import type { PublicUser, User } from "../api/types";
import { Profile } from "../components/Profile/Profile";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Spinner } from "../components/common/Spinner";
import { ProgressOverview } from "../components/progress/ProgressOverview";
import { ShareButton } from "../components/progress/ShareButton";
import { useAuth } from "../context/AuthContext";
import { MY_PROGRESS_QUERY, SET_PROGRESS_PUBLIC_MUTATION, USER_PROGRESS_QUERY, type PracticeProgress } from "../api/progress";
import { getErrorMessage } from "../api/errors";

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
  return <main className="page-shell settings-page"><header className="page-heading"><div><span className="section-kicker">Профиль</span><h1>Настройки</h1><p>Основная информация аккаунта</p></div></header><Profile /></main>;
}

function UserProfile({ userID, own }: { userID: string; own: boolean }) {
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [setProgressPublic, visibilityState] = useMutation<{ setMyPracticeStatsPublic: boolean }>(SET_PROGRESS_PUBLIC_MUTATION);
  // Свой профиль — полный запрос getUser; чужой — только публичный userProfile
  // (getUser отдаёт email/phone только владельцу/админу — IDOR-защита на gateway).
  const mine = useQuery<{ getUser: User }>(GET_USER_QUERY, { variables: { id: userID }, skip: !userID || !own });
  const foreign = useQuery<{ userProfile: PublicUser }>(PUBLIC_USER_QUERY, { variables: { id: userID }, skip: !userID || own });
  const answers = useQuery<{ myITSubmissions: { items: ITSubmission[] } }>(MY_IT_SUBMISSIONS_QUERY, { variables: { taskId: null, pagination: { limit: 20, offset: 0 } }, skip: !own });
  const code = useQuery<{ myITCodeSubmissions: { items: ITCodeSubmission[] } }>(MY_IT_CODE_SUBMISSIONS_QUERY, { variables: { taskId: null, pagination: { limit: 20, offset: 0 } }, skip: !own });
  const mineProgress = useQuery<{ myPracticeProgress: PracticeProgress }>(MY_PROGRESS_QUERY, { skip: !own, fetchPolicy: "network-only" });
  const peerProgress = useQuery<{ practiceProgress: PracticeProgress | null }>(USER_PROGRESS_QUERY, { variables: { userId: userID }, skip: own || !userID, fetchPolicy: "network-only" });
  const user = own ? mine : foreign;
  const profile = own ? mine.data?.getUser : foreign.data?.userProfile;
  const progress = own ? mineProgress.data?.myPracticeProgress : peerProgress.data?.practiceProgress;
  const progressLoading = own ? mineProgress.loading : peerProgress.loading;
  const progressError = own ? mineProgress.error : peerProgress.error;

  async function changeVisibility() {
    if (!progress || !own) return;
    setVisibilityError(null);
    try {
      await setProgressPublic({ variables: { public: !progress.public } });
      await mineProgress.refetch();
    } catch (cause) {
      setVisibilityError(getErrorMessage(cause));
    }
  }

  if (user.loading && !profile) return <main className="page-shell content-state"><Spinner label="Загружаем профиль…" /></main>;
  if (user.error || !profile) return <main className="page-shell"><ErrorMessage message={user.error ? getErrorMessage(user.error) : "Профиль не найден"} /></main>;

  const attempts = [
    ...(answers.data?.myITSubmissions.items ?? []).map((item) => ({ id: item.id, taskId: item.taskId, date: item.createdAt, verdict: item.verdict, detail: `Тест · версия ${item.taskVersionNumber}`, href: `/history/${item.id}` })),
    ...(code.data?.myITCodeSubmissions.items ?? []).map((item) => ({ id: item.id, taskId: item.taskId, date: item.createdAt, verdict: item.verdict ?? item.status, detail: `${item.language === "python" ? "Python" : "Go"} · файл ${item.sourceFileName}`, href: `/code-submission/${item.id}` })),
  ].sort((left, right) => right.date.localeCompare(left.date));
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.username;
  const isSuperuser = "isSuperuser" in profile ? profile.isSuperuser : false;
  const roleLabel = isSuperuser ? "Суперпользователь" : profile.isAdmin ? "Администратор" : "Участник";

  return <main className="page-shell user-profile-page">
    <section className="profile-hero">
      <aside className="profile-identity">
        <div className="profile-avatar">
          {profile.avatar?.smallUrl || profile.avatar?.mediumUrl ? (
            <img className="profile-avatar-img" src={profile.avatar.mediumUrl || profile.avatar.smallUrl} alt={`Аватар ${displayName}`} />
          ) : (
            <span>{displayName.slice(0, 1).toUpperCase()}</span>
          )}
          <small>На платформе с {formatDate(profile.createdAt)}</small>
        </div>
        <dl>
          <div><dt>Роль</dt><dd>{roleLabel}</dd></div>
        </dl>
      </aside>

      <div className="profile-main">
        <header>
          <div>
            <span className="section-kicker">Профиль</span>
            <h1>{displayName}</h1>
            <p>@{profile.username}</p>
          </div>
          <div className="profile-actions">
            {own && <Link className="button button--ghost profile-settings-link" to="/profile/settings"><Settings size={15} /> Настройки</Link>}
            {progress?.public && <ShareButton path={`/users/${profile.id}`} title={`Практика ${displayName}`} label="Поделиться статистикой" />}
            {!own && progress && <Link className="button button--ghost" to={`/compare/${profile.id}`}>Сравнить с собой</Link>}
            <Link className="button button--ghost" to="/leaderboard">Рейтинг</Link>
          </div>
        </header>

        {progressLoading && !progress && <div className="content-state"><Spinner label="Загружаем статистику…" /></div>}
        {progressError && <ErrorMessage message={getErrorMessage(progressError)} />}
        {progress && <ProgressOverview progress={progress} />}
        {!own && !progressLoading && !progressError && !progress && <div className="content-state content-state--compact"><UserRound size={22} /><strong>Статистика закрыта</strong><p>Пользователь пока не открыл свою статистику практики.</p></div>}
        {own && progress && <section className="progress-visibility" aria-label="Публичность статистики">
          <div><strong>Показывать статистику другим</strong><p>{progress.public ? "Другие участники видят сводку, могут сравнить её со своей, а вы участвуете в рейтинге." : "Сейчас сводка доступна только вам. Откройте её, чтобы участвовать в рейтинге и делиться ссылкой."}</p></div>
          <button className="button" type="button" disabled={visibilityState.loading} onClick={() => { void changeVisibility(); }}>{visibilityState.loading ? "Сохраняем…" : progress.public ? "Закрыть статистику" : "Открыть статистику"}</button>
          <ErrorMessage message={visibilityError} />
        </section>}

        <section className="attempts-section">
          <div className="section-title"><div><span className="section-kicker">Решения</span><h2>Последние попытки</h2></div></div>
          {(answers.loading || code.loading) && attempts.length === 0
            ? <div className="content-state"><Spinner label="Загружаем попытки…" /></div>
            : !own
              ? <div className="content-state content-state--compact"><UserRound size={22} /><strong>История попыток закрыта</strong><p>Подробные попытки видны только владельцу профиля.</p></div>
              : attempts.length === 0
                ? <div className="content-state content-state--compact"><Code2 size={22} /><strong>Попыток пока нет</strong><p>Откройте задачу и отправьте первое решение.</p></div>
                : <div className="attempt-list">{attempts.map((attempt) => (
                    <Link className="attempt-row" key={`${attempt.detail}-${attempt.id}`} to={attempt.href}>
                      <span className={`verdict-dot${attempt.verdict === "accepted" ? " is-accepted" : attempt.verdict === "queued" || attempt.verdict === "completed" ? " is-queued" : " is-wrong"}`} />
                      <div><strong>Задача {attempt.taskId.slice(0, 8)}</strong><p>{attempt.detail}</p></div>
                      <div className="attempt-row__verdict"><span className={`verdict-pill${attempt.verdict === "accepted" ? " is-accepted" : attempt.verdict === "queued" || attempt.verdict === "completed" ? " is-queued" : " is-wrong"}`}>{verdictLabel(attempt.verdict)}</span><p>{formatDateTime(attempt.date)}</p></div>
                    </Link>
                  ))}
                  <Link className="attempts-more" to="/history">Вся история решений <ArrowRight size={14} /></Link>
                </div>}
        </section>
      </div>
    </section>
  </main>;
}

function verdictLabel(value: string) { return value === "accepted" ? "Принято" : value === "queued" ? "В очереди" : value === "completed" ? "Проверено" : "Ошибка"; }
function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
