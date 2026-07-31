import { useMutation, useQuery } from "@apollo/client";
import type { FormEvent } from "react";
import { useState } from "react";
import { ADMIN_USERS_QUERY, SET_USER_ADMIN } from "../../api/adminUsers";
import type { User } from "../../api/types";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Spinner } from "../../components/common/Spinner";
import { useAuth } from "../../context/AuthContext";

export function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const { data, loading, error, refetch } = useQuery<{ users: User[] }>(ADMIN_USERS_QUERY, { variables: { search } });
  const [setAdmin, setAdminState] = useMutation(SET_USER_ADMIN);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("search") ?? "").trim();
    setSearch(value);
  };

  if (!isAdmin) {
    return <main className="page-shell panel"><ErrorMessage message="Раздел доступен только администраторам." /></main>;
  }

  if (loading) return <Spinner />;

  return <main className="page-shell panel catalog"><h1>Пользователи</h1><form className="inline-form" onSubmit={submit}><label className="field"><span>Username или email</span><input name="search" placeholder="student01" defaultValue={search} /></label><button className="button">Найти</button></form>{(error || setAdminState.error) && <ErrorMessage message={(error ?? setAdminState.error)?.message ?? "Ошибка"} />}<div className="catalog-list">{data?.users.map((user) => <article className="catalog-row" key={user.id}><div><strong>{user.username}</strong><p>{user.email}</p><p>{user.isSuperuser ? "Суперпользователь" : user.isAdmin ? "Администратор" : "Пользователь"}</p></div><button className="button" disabled={user.isSuperuser || setAdminState.loading} onClick={() => void setAdmin({ variables: { id: user.id, admin: !user.isAdmin } }).then(() => refetch())}>{user.isAdmin ? "Снять admin" : "Сделать admin"}</button></article>)}</div></main>;
}
