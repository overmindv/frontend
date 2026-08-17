import { useMutation, useQuery } from "@apollo/client";
import { Ellipsis, Search, ShieldCheck, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ADMIN_USERS_QUERY, SET_USER_ADMIN } from "../../api/adminUsers";
import type { User } from "../../api/types";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Spinner } from "../../components/common/Spinner";
import { useAuth } from "../../context/AuthContext";

// AdminUsersPage ищет пользователей только после явного запроса администратора.
export function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search")?.trim() ?? "";
  const [search, setSearch] = useState(initialSearch);
  const [draft, setDraft] = useState(initialSearch);
  const [submitted, setSubmitted] = useState(Boolean(initialSearch));
  const [adminsMode, setAdminsMode] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery<{ users: User[] }>(ADMIN_USERS_QUERY, { variables: { search }, skip: !submitted || adminsMode });
  const [setAdmin, setAdminState] = useMutation(SET_USER_ADMIN);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setSearch(value);
    setSubmitted(true);
    setAdminsMode(false);
  };

  // changeAdmin подтверждает чувствительное изменение роли перед отправкой.
  const changeAdmin = async (user: User) => {
    const action = user.isAdmin ? "снять права администратора" : "назначить администратором";
    if (!window.confirm(`Подтвердите действие: ${action} для @${user.username}?`)) return;
    await setAdmin({ variables: { id: user.id, admin: !user.isAdmin } });
    setOpenMenu(null);
    await refetch();
  };

  if (!isAdmin) return <main className="page-shell"><ErrorMessage message="Раздел доступен только администраторам." /></main>;

  const users = data?.users ?? [];

  return <main className="page-shell admin-users-page"><header className="page-heading"><div><span className="section-kicker">Администрирование</span><h1>Пользователи</h1><p>Поиск аккаунтов и управление ролями</p></div><UserRound size={28} /></header><div className="admin-users-layout"><aside className="admin-user-filters"><strong>Поиск</strong><form onSubmit={submit}><label className="catalog-search"><Search size={17} /><input aria-label="Username или email" onChange={(event) => setDraft(event.target.value)} placeholder="Username или email" value={draft} /></label><button className="button button--primary" disabled={!draft.trim()}>Найти пользователя</button></form><button className={`button button--ghost${adminsMode ? " is-active" : ""}`} onClick={() => { setAdminsMode(true); setSubmitted(false); }} type="button"><ShieldCheck size={17} /> Текущие администраторы</button><p>Расширенные фильтры и полный список администраторов появятся после обновления API.</p></aside><section className="admin-user-results"><div className="section-title"><div><span className="section-kicker">Результаты</span><h2>{adminsMode ? "Администраторы" : submitted ? `Поиск: ${search}` : "Начните с поиска"}</h2></div>{submitted && <span>{users.length}</span>}</div>{(error || setAdminState.error) && <ErrorMessage message={(error ?? setAdminState.error)?.message ?? "Ошибка"} />}{adminsMode ? <div className="content-state"><ShieldCheck size={28} /><strong>Нужен отдельный запрос API</strong><p>Текущий контракт не позволяет получить полный список администраторов без пропусков.</p></div> : loading ? <div className="content-state"><Spinner label="Ищем пользователей…" /></div> : !submitted ? <div className="content-state"><Search size={28} /><strong>Список намеренно пуст</strong><p>Введите username или email в панели слева.</p></div> : users.length === 0 ? <div className="content-state"><UserRound size={28} /><strong>Никого не найдено</strong><p>Проверьте запрос и попробуйте снова.</p></div> : <div className="user-result-list">{users.map((user) => <article className="user-result-row" key={user.id}><Link to={`/users/${user.id}`}><span className="user-avatar-small">{user.username.slice(0, 1).toUpperCase()}</span><div><strong>@{user.username}</strong><p>{user.email}</p></div></Link><span className="role-badge">{user.isSuperuser ? "Суперпользователь" : user.isAdmin ? "Администратор" : "Пользователь"}</span><div className="row-menu"><button className="header-icon" disabled={user.isSuperuser} onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)} aria-label="Действия с пользователем"><Ellipsis size={19} /></button>{openMenu === user.id && <div className="popover-menu popover-menu--right"><Link to={`/users/${user.id}`}>Открыть профиль</Link><button className={user.isAdmin ? "danger-action" : ""} onClick={() => void changeAdmin(user)} disabled={setAdminState.loading}>{user.isAdmin ? "Снять права администратора" : "Назначить администратором"}</button></div>}</div></article>)}</div>}</section></div></main>;
}
