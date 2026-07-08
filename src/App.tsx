import { Header } from "./components/common/Header";
import { AppRoutes } from "./routes";

export default function App() {
  return (
    <div className="app-frame">
      <Header />
      <AppRoutes />
    </div>
  );
}
