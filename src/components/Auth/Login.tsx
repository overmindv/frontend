import { useState, type FormEvent } from "react";
import { useMutation } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";
import { LOGIN_MUTATION } from "../../api/mutations";
import { getErrorMessage } from "../../api/errors";
import type { AuthPayload, LoginInput } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { ErrorMessage } from "../common/ErrorMessage";
import { Spinner } from "../common/Spinner";

interface LoginData {
  login: AuthPayload;
}

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [login, { loading }] = useMutation<LoginData, { input: LoginInput }>(
    LOGIN_MUTATION,
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const result = await login({
        variables: { input: { email: email.trim(), password } },
      });
      if (!result.data?.login) throw new Error("Сервер вернул пустой ответ.");
      signIn(result.data.login);
      navigate("/profile", { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form__heading">
        <span className="eyebrow">С возвращением</span>
        <h1>Вход в аккаунт</h1>
        <p>Введите почту и пароль, указанные при регистрации.</p>
      </div>

      <ErrorMessage message={errorMessage} />

      <label className="field">
        <span>Электронная почта</span>
        <input
          autoComplete="email"
          inputMode="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
      </label>

      <label className="field">
        <span>Пароль</span>
        <input
          autoComplete="current-password"
          minLength={8}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      <button className="button button--primary" disabled={loading} type="submit">
        {loading ? <Spinner label="Входим…" /> : "Войти"}
      </button>

      <p className="form__footer">
        Ещё нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </form>
  );
}
