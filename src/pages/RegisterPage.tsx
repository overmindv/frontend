import { Register } from "../components/Auth/Register";

export function RegisterPage() {
  return (
    <main className="auth-page auth-page--register">
      <section className="auth-page__intro">
        <span className="eyebrow">Начало работы</span>
        <h2>Создайте профиль за пару минут.</h2>
        <p>Данные профиля можно изменить позднее. Почта останется логином для входа.</p>
      </section>
      <div className="auth-page__card"><Register /></div>
    </main>
  );
}
