import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@apollo/client";
import { Bell, ChevronDown, CircleUserRound, LogIn, Menu, Moon, Settings, Shield, Sun, X } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { SEARCH_QUERY, SEARCH_KINDS, kindDescription, kindHref, kindTitle, totalResults, type SearchResults, type Searchable } from "../../api/search";

const primaryLinks = [
  ["/", "Главная"],
  ["/search", "Поиск"],
  ["/universities", "Университеты"],
  ["/programs", "Программы"],
  ["/courses", "Курсы"],
  ["/topics", "Темы"],
  ["/tasks", "Задачи"],
] as const;

type SearchGroup = { kind: (typeof SEARCH_KINDS)[number]; items: Searchable[] };

// Header формирует каркас приложения: спокойный сайдбар с навигацией и тонкий
// топбар с глобальным поиском и действиями. На страницах входа/регистрации
// остаётся только топбар.
export function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const { preference, resolvedTheme, cycleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  // Закрываем все меню и сбрасываем поиск при смене маршрута: попапы не должны
  // переживать навигацию (клик по ссылке меню, back/forward, Enter в поиске,
  // logout и повторный вход в другой аккаунт).
  useEffect(() => {
    setMobileOpen(false);
    setAdminOpen(false);
    setProfileOpen(false);
    setQuery("");
    setDebouncedQuery("");
  }, [location.pathname, location.search]);

  // Дебаунс запроса подсказок, чтобы не дёргать бэкенд на каждый символ.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [query]);

  const { data, loading } = useQuery<{ search: SearchResults }>(SEARCH_QUERY, {
    variables: { query: debouncedQuery, limit: 5 },
    skip: !debouncedQuery,
  });

  const groups = useMemo(() => {
    const results = data?.search;
    if (!results || totalResults(results) === 0) return [] as SearchGroup[];
    const out: SearchGroup[] = [];
    for (const kind of SEARCH_KINDS) {
      const items = results[kind.key] as unknown as Searchable[];
      if (items.length) out.push({ kind, items });
    }
    return out;
  }, [data]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const closeMobile = () => setMobileOpen(false);

  return <>
    {!isAuthPage && (
      <aside className={`app-sidebar${mobileOpen ? " is-open" : ""}`} id="app-sidebar">
        <Link className="brand" to="/" aria-label="Overmindv — главная">
          <span className="brand__mark">О</span>
          <span className="brand__text"><strong>Overmindv</strong><small>учебная платформа</small></span>
        </Link>

        <nav className="sidebar-nav" aria-label="Основная навигация">
          {primaryLinks.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={closeMobile}>{label}</NavLink>
          ))}
        </nav>

        {isAuthenticated && (
          <nav className="sidebar-nav sidebar-nav--secondary" aria-label="Личное">
            <span className="sidebar-nav__label">Личное</span>
            <NavLink to="/history" onClick={closeMobile}>История решений</NavLink>
            <NavLink to="/profile" onClick={closeMobile}>Профиль</NavLink>
          </nav>
        )}

        {isAdmin && (
          <nav className="sidebar-nav sidebar-nav--secondary" aria-label="Администрирование">
            <span className="sidebar-nav__label">Администрирование</span>
            <Link to="/admin/catalog/universities" onClick={closeMobile}>Каталог</Link>
            <Link to="/admin/tasks/new" onClick={closeMobile}>Создать задачу</Link>
            <Link to="/admin/collected-tasks" onClick={closeMobile}>Сбор и проверка</Link>
            <Link to="/admin/users" onClick={closeMobile}>Пользователи</Link>
          </nav>
        )}

        <div className="sidebar__footer">
          {!isAuthenticated && <Link className="button button--primary button--full" to="/login" onClick={closeMobile}>Войти</Link>}
        </div>
      </aside>
    )}

    {mobileOpen && !isAuthPage && <button className="sidebar-backdrop" aria-label="Закрыть меню" onClick={closeMobile} type="button" />}

    <header className="app-topbar">
      {!isAuthPage && (
        <button className="header-icon mobile-menu-button" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-label="Открыть меню" type="button">
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      )}

      {isAuthPage && <Link className="brand" to="/" aria-label="Overmindv — главная"><span className="brand__mark">О</span><span className="brand__text"><strong>Overmindv</strong></span></Link>}

      <form className="global-search" onSubmit={submitSearch} role="search">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input aria-label="Глобальный поиск" onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по каталогу и задачам" value={query} />
        <kbd>⌘ K</kbd>
        {query.trim() && (
          <div className="global-search__suggestions" aria-label="Варианты поиска">
            {loading
              ? <p className="global-search__state">Ищем…</p>
              : groups.length === 0
                ? <p className="global-search__state">Нет совпадений по запросу «{query.trim()}»</p>
                : groups.map(({ kind, items }) => (
                    <div className="global-search__group" key={kind.key}>
                      <span className="global-search__group-label">{kind.label}</span>
                      {items.map((item) => (
                        <Link key={item.id} to={`${kindHref(kind.key)}/${item.id}`} onClick={() => setQuery("")}>
                          <strong>{kindTitle(item)}</strong>
                          <small>{kind.singular} · {kindDescription(item)}</small>
                        </Link>
                      ))}
                    </div>
                  ))}
          </div>
        )}
      </form>

      <div className="header-actions">
        {isAdmin && <button className="header-icon" onClick={() => navigate("/notifications")} aria-label="Уведомления" title="Уведомления" type="button"><Bell size={17} /></button>}
        <button className="header-icon" onClick={cycleTheme} title={`Тема: ${preference}`} type="button" aria-label="Переключить тему">
          {resolvedTheme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        {isAdmin && (
          <div className="header-menu">
            <button className="header-action" onClick={() => setAdminOpen((value) => !value)} type="button">
              <Shield size={16} /> <span className="action-label">Админ</span> <ChevronDown className="chevron" size={13} />
            </button>
            {adminOpen && <AdminMenu close={() => setAdminOpen(false)} />}
          </div>
        )}
        {isAuthenticated ? (
          <div className="header-menu">
            <button className="header-icon" onClick={() => setProfileOpen((value) => !value)} aria-label="Меню профиля" type="button">
              <CircleUserRound size={19} />
            </button>
            {profileOpen && (
              <div className="popover-menu popover-menu--right">
                <Link onClick={() => setProfileOpen(false)} to="/profile"><CircleUserRound size={15} /> Профиль</Link>
                <Link onClick={() => setProfileOpen(false)} to="/profile/settings"><Settings size={15} /> Настройки</Link>
                <button onClick={logout} type="button"><LogIn size={15} /> Выйти</button>
              </div>
            )}
          </div>
        ) : (
          <Link className="header-action" to="/login"><LogIn size={16} /> <span className="action-label">Войти</span></Link>
        )}
      </div>
    </header>
  </>;
}

// AdminMenu группирует административные переходы отдельно от пользовательской навигации.
function AdminMenu({ close }: { close: () => void }) {
  return <div className="popover-menu popover-menu--right">
    <Link onClick={close} to="/admin/tasks/new">Создать задачу</Link>
    <Link onClick={close} to="/admin/collected-tasks">Сбор и проверка</Link>
    <Link onClick={close} to="/admin/catalog/universities">Управление каталогом</Link>
    <Link onClick={close} to="/admin/users">Пользователи</Link>
  </div>;
}
