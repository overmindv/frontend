import { useState, type FormEvent } from "react";
import { BookOpen, ChevronDown, CircleUserRound, Library, LogIn, Menu, Moon, Search, Settings, Shield, Sun, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const mainLinks = [
  ["/", "Главная"], ["/universities", "Университеты"], ["/programs", "Программы"],
  ["/courses", "Курсы"], ["/topics", "Темы"], ["/tasks", "Задачи"],
] as const;

// Header отображает общую навигацию, поиск и действия текущей роли.
export function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const { preference, resolvedTheme, cycleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) navigate(`/tasks?search=${encodeURIComponent(query.trim())}`);
  };
  const searchTargets = [
    ["/tasks", "Задачи", "По названиям на текущей странице"],
    ["/universities", "Университеты", "По названиям и городам"],
    ["/programs", "Программы", "По названиям программ"],
    ["/courses", "Курсы", "По названиям курсов"],
    ["/topics", "Темы", "По названиям тем"],
    ...(isAdmin ? [["/admin/users", "Пользователи", "По username или email"]] : []),
  ];

  return <>
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" to="/" aria-label="Overmindv — главная"><span className="brand__mark">O</span><strong>Overmindv</strong></Link>
        <nav className={`main-nav${mobileOpen ? " is-open" : ""}`} aria-label="Основная навигация">
          {mainLinks.map(([to, label]) => <NavLink key={to} onClick={() => setMobileOpen(false)} to={to} end={to === "/"}>{label}</NavLink>)}
        </nav>
        <form className="global-search" onSubmit={submitSearch} role="search"><Search size={17} /><input aria-label="Глобальный поиск" onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" value={query} /><kbd>⌘ K</kbd>{query.trim() && <div className="global-search__suggestions" aria-label="Варианты поиска">{searchTargets.map(([to, label, description]) => <Link key={to} onClick={() => setQuery("")} to={`${to}?search=${encodeURIComponent(query.trim())}`}><Search size={15} /><span><strong>Искать «{query.trim()}» в разделе «{label}»</strong><small>{description}</small></span></Link>)}<p>Полный поиск по всем данным появится после подключения серверного индекса.</p></div>}</form>
        <div className="header-actions">
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
