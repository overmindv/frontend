import { Register } from "../components/Auth/Register";

export function RegisterPage() {
  return (
    <main className="auth-page auth-page--register auth-page--compact">
      <div className="auth-page__card"><Register /></div>
    </main>
  );
}
