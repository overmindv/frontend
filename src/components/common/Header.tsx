import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from "react";
import { useQuery } from "@apollo/client";
import { Bell, BookOpen, Building2, ChevronDown, CircleUserRound, ClipboardList, GraduationCap, Library, LogIn, Menu, Moon, Search, Settings, Shield, Sun, Tags, X } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { SEARCH_QUERY, SEARCH_KINDS, kindDescription, kindHref, kindTitle, totalResults, type SearchKindKey, type SearchResults, type Searchable } from "../../api/search";

const mainLinks = [
  ["/", "Главная"], ["/universities", "Университеты"], ["/programs", "Программы"],
  ["/courses", "Курсы"], ["/topics", "Темы"], ["/tasks", "Задачи"],
] as const;

const kindIcons: Record<SearchKindKey, ComponentType<{ size?: number }>> = {
  universities: Building2,
  programs: GraduationCap,
  courses: BookOpen,
  topics: Tags,
  tasks: ClipboardList,
};

type SearchGroup = { kind: (typeof SEARCH_KINDS)[number]; items: Searchable[] };

// Header отображает общую навигацию, поиск и действия текущей роли.
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

  return <>
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" to="/" aria-label="Overmindv — главная"><span className="brand__mark">O</span><strong>Overmindv</strong></Link>
        <nav className={`main-nav${mobileOpen ? " is-open" : ""}`} aria-label="Основная навигация">
          {mainLinks.map(([to, label]) => <NavLink key={to} onClick={() => setMobileOpen(false)} to={to} end={to === "/"}>{label}</NavLink>)}
        </nav>
        <form className="global-search" onSubmit={submitSearch} role="search"><Search size={17} /><input aria-label="Глобальный поиск" onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" value={query} /><kbd>⌘ K</kbd>{query.trim() && <div className="global-search__suggestions" aria-label="Варианты поиска">{loading ? <p className="global-search__state">Ищем…</p> : groups.length === 0 ? <p className="global-search__state">Нет совпадений по запросу «{query.trim()}»</p> : groups.map(({ kind, items }) => { const Icon = kindIcons[kind.key]; return <div className="global-search__group" key={kind.key}><span className="global-search__group-label">{kind.label}</span>{items.map((item) => <Link key={item.id} onClick={() => setQuery("")} to={`${kindHref(kind.key)}/${item.id}`}><Icon size={15} /><span><strong>{kindTitle(item)}</strong><small>{kind.singular} · {kindDescription(item)}</small></span></Link>)}</div> })}</div>}</form>
        <div className="header-actions">
          {isAdmin && <Link className="header-icon" to="/notifications" aria-label="Уведомления" title="Уведомления"><Bell size={18} /></Link>}
          <button className="header-icon" onClick={cycleTheme} title={`Тема: ${preference}`} type="button" aria-label="Переключить тему">{resolvedTheme === "dark" ? <Moon size={18} /> : <Sun size={18} />}</button>
          {isAdmin && <div className="header-menu"><button className="header-action" onClick={() => setAdminOpen((value) => !value)} type="button"><Shield size={17} /> Админ <ChevronDown size={14} /></button>{adminOpen && <AdminMenu close={() => setAdminOpen(false)} />}</div>}
          {isAuthenticated ? <div className="header-menu"><button className="header-icon" onClick={() => setProfileOpen((value) => !value)} aria-label="Меню профиля" type="button"><CircleUserRound size={21} /></button>{profileOpen && <div className="popover-menu popover-menu--right"><Link onClick={() => setProfileOpen(false)} to="/profile"><CircleUserRound size={16} /> Профиль</Link><Link onClick={() => setProfileOpen(false)} to="/profile/settings"><Settings size={16} /> Настройки</Link><button onClick={logout} type="button"><LogIn size={16} /> Выйти</button></div>}</div> : <Link className="header-action" to="/login"><LogIn size={17} /> Войти</Link>}
          <button className="header-icon mobile-menu-button" onClick={() => setMobileOpen((value) => !value)} aria-label="Открыть меню" type="button">{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </div>
    </header>
  </>;
}

// AdminMenu группирует административные переходы отдельно от пользовательской навигации.
function AdminMenu({ close }: { close: () => void }) {
  return <div className="popover-menu popover-menu--right"><Link onClick={close} to="/admin/tasks/new"><BookOpen size={16} /> Создать задачу</Link><Link onClick={close} to="/admin/collected-tasks"><Library size={16} /> Сбор и проверка</Link><Link onClick={close} to="/admin/catalog/universities"><Library size={16} /> Управление каталогом</Link><Link onClick={close} to="/admin/users"><CircleUserRound size={16} /> Пользователи</Link></div>;
}
