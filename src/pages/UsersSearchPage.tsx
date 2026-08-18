import { useQuery } from "@apollo/client";
import { Search, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SEARCH_USERS_QUERY } from "../api/publicUsers";
import type { PublicUser } from "../api/types";
import { AvatarImage } from "../components/Profile/AvatarImage";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Spinner } from "../components/common/Spinner";

const pageSize = 20;

// UsersSearchPage выполняет безопасный поиск пользователей без приватных полей.
export function UsersSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search")?.trim() ?? "";
  const initialOffset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const [draft, setDraft] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [offset, setOffset] = useState(initialOffset);
  const validSearch = search.length >= 2;
  const { data, loading, error } = useQuery<{ searchUsers: { items: PublicUser[]; limit: number; offset: number } }>(SEARCH_USERS_QUERY, {
    variables: { search, pagination: { limit: pageSize, offset } },
    skip: !validSearch,
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = draft.trim();
    if (value.length < 2) return;

    setSearch(value);
    setOffset(0);
    setSearchParams({ search: value });
  };

  const changePage = (nextOffset: number) => {
    setOffset(nextOffset);
    setSearchParams({ search, offset: String(nextOffset) });
  };

  const users = data?.searchUsers.items ?? [];

  return <main className="page-shell users-search-page"><header className="page-heading"><div><span className="section-kicker">Сообщество</span><h1>Пользователи</h1><p>Поиск по username, имени и фамилии</p></div><UserRound size={28} /></header><form className="users-search-form" onSubmit={submit}><label className="catalog-search"><Search size={18} /><input aria-label="Поиск пользователей" minLength={2} onChange={(event) => setDraft(event.target.value)} placeholder="Минимум 2 символа" value={draft} /></label><button className="button button--primary" disabled={draft.trim().length < 2}>Найти</button></form>{error && <ErrorMessage message={error.message} />}{loading ? <div className="content-state"><Spinner label="Ищем пользователей…" /></div> : !validSearch ? <div className="content-state"><Search size={28} /><strong>Введите запрос</strong><p>Поиск доступен авторизованным пользователям.</p></div> : users.length === 0 ? <div className="content-state"><UserRound size={28} /><strong>Никого не найдено</strong></div> : <><section className="user-result-list public-user-results">{users.map((user) => { const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username; return <article className="user-result-row" key={user.id}><Link to={`/users/${user.id}`}><span className="user-avatar-small"><AvatarImage avatar={user.avatar} label={displayName} size={128} lazy /></span><div><strong>{displayName}</strong><p>@{user.username}</p></div></Link>{user.isAdmin && <span className="role-badge">Администратор</span>}</article>; })}</section><nav className="pagination" aria-label="Страницы поиска"><button className="button button--ghost" disabled={offset === 0} onClick={() => changePage(Math.max(0, offset - pageSize))}>Назад</button><span>{offset + 1}–{offset + users.length}</span><button className="button button--ghost" disabled={users.length < pageSize} onClick={() => changePage(offset + pageSize)}>Далее</button></nav></>}</main>;
}
