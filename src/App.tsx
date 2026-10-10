import { useLocation } from "react-router-dom";
import { Header } from "./components/common/Header";
import { AppRoutes } from "./routes";
import { CollectionNotifications } from "./components/CollectionNotifications";

export default function App() {
  const location = useLocation();
  // На страницах входа/регистрации сайдбар и глобальный поиск не нужны.
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className={isAuthPage ? "app-frame is-auth" : "app-frame"}>
      <Header />
      <div className="app-frame__main">
        <CollectionNotifications />
        <AppRoutes />
      </div>
    </div>
  );
}
