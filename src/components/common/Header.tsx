import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function Header() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="header">
      <NavLink className="brand" to={isAuthenticated ? "/profile" : "/login"}>
        <span className="brand__mark">S</span>
        <span>
          <strong>Soundwave</strong>
          <small>Overmindv account</small>
        </span>
      </NavLink>

      <nav className="nav" aria-label="Основная навигация">
        {isAuthenticated ? (
          <>
            <NavLink to="/profile">Профиль</NavLink>
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
