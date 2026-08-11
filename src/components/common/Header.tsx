import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function Header() {
  const { isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <header className="header">
      <NavLink className="brand" to="/tasks">
        <span className="brand__mark">O</span>
        <span>
          <strong>Overmindv</strong>
          <small>practice console</small>
        </span>
      </NavLink>

      <nav className="nav" aria-label="Основная навигация">
        <NavLink to="/tasks">Задачи</NavLink>
        {isAuthenticated ? (
          <>
            <NavLink to="/history">История</NavLink>
            <NavLink to="/profile">Профиль</NavLink>
            {isAdmin && <NavLink to="/admin/tasks">Управление</NavLink>}
            {isAdmin && <NavLink to="/admin/collected-tasks">Сбор</NavLink>}
            {isAdmin && <NavLink to="/admin/catalog/universities">Каталог</NavLink>}
            {isAdmin && <NavLink to="/admin/users">Люди</NavLink>}
            <button className="button button--ghost button--small" onClick={logout} type="button">
              Выйти
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login">Войти</NavLink>
            <NavLink to="/register">Регистрация</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
