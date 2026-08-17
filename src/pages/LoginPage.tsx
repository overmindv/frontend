import { Login } from "../components/Auth/Login";

export function LoginPage() {
  return (
    <main className="auth-page auth-page--compact">
      <div className="auth-page__card"><Login /></div>
    </main>
  );
}
