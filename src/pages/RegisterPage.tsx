import { Register } from "../components/Auth/Register";

export function RegisterPage() {
  return (
    <main className="auth-page auth-page--register">
      <section className="auth-page__intro">
        <span className="eyebrow">Начало практики</span>
        <h2>Один профиль для всех попыток.</h2>
        <p>История решений сохранится в аккаунте и позже станет основой персональных рекомендаций.</p>
      </section>
      <div className="auth-page__card"><Register /></div>
    </main>
  );
}
