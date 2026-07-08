import { Login } from "../components/Auth/Login";

export function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-page__intro">
        <span className="eyebrow">Overmindv platform</span>
        <h2>Один профиль для всей учебной платформы.</h2>
        <p>Продолжайте обучение, управляйте материалами и отслеживайте задачи из единого аккаунта.</p>
      </section>
      <div className="auth-page__card"><Login /></div>
    </main>
  );
}
