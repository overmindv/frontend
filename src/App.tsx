import { Header } from "./components/common/Header";
import { AppRoutes } from "./routes";
import { CollectionNotifications } from "./components/CollectionNotifications";

export default function App() {
  return (
    <div className="app-frame">
      <Header />
      <CollectionNotifications />
      <AppRoutes />
    </div>
  );
}
