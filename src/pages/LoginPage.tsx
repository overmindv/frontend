import { Login } from "../components/Auth/Login";

export function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-page__intro">
        <span className="eyebrow">Overmindv practice</span>
        <h2>Практика, которая помнит контекст.</h2>
        <p>Решайте тесты, возвращайтесь к прошлым попыткам и постепенно собирайте свою траекторию обучения.</p>
      </section>
      <div className="auth-page__card"><Login /></div>
    </main>
  );
}
