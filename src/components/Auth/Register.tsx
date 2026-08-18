import { useState, type FormEvent } from "react";
import { useMutation } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";
import { REGISTER_MUTATION } from "../../api/mutations";
import { clearStoredAuth, storeStoredAuth } from "../../api/client";
import { getErrorMessage } from "../../api/errors";
import { uploadAvatar } from "../../api/media";
import type { AuthPayload, RegisterInput } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { ErrorMessage } from "../common/ErrorMessage";
import { Spinner } from "../common/Spinner";
import { AvatarCropper } from "../Profile/AvatarCropper";

interface RegisterData {
  register: AuthPayload;
}

const initialForm = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  username: "",
  birthDate: "",
  phone: "",
};

export function Register() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<Blob | null>(null);
  const [avatarSelected, setAvatarSelected] = useState(false);
  const [avatarProcessing, setAvatarProcessing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [registeredAuth, setRegisteredAuth] = useState<AuthPayload | null>(null);
  const [register, { loading }] = useMutation<
    RegisterData,
    { input: RegisterInput }
  >(REGISTER_MUTATION);

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (avatarProcessing || (avatarSelected && !avatar)) {
      setErrorMessage("Дождитесь завершения обработки фото.");

      return;
    }

    setErrorMessage(null);
    try {
      let auth = registeredAuth;
      if (!auth) {
        const input: RegisterInput = {
          email: form.email.trim(),
          password: form.password,
          username: form.username.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          ...(form.birthDate ? { birthDate: form.birthDate } : {}),
        };
        const result = await register({ variables: { input } });
        if (!result.data?.register) throw new Error("Сервер вернул пустой ответ.");
        auth = result.data.register;
        setRegisteredAuth(auth);
      }

      if (avatar) {
        // AuthContext остаётся гостевым до конца загрузки, поэтому PublicOnlyRoute не прерывает процесс.
        storeStoredAuth(auth.token, auth.user.id);
        setAvatarUploading(true);
        try {
          await uploadAvatar(avatar);
        } catch (error) {
          clearStoredAuth();
          throw error;
        } finally {
          setAvatarUploading(false);
        }
      }

      signIn(auth);
      navigate("/profile", { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <form className="form form--wide" onSubmit={handleSubmit}>
      <div className="form__heading">
        <h1>Регистрация</h1>
      </div>

      <ErrorMessage message={errorMessage} />

      <div className="form-grid">
        <label className="field field--full">
          <span>Электронная почта</span>
          <input autoComplete="email" name="email" onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" required type="email" value={form.email} />
        </label>
        <label className="field field--full">
          <span>Пароль</span>
          <input autoComplete="new-password" minLength={8} name="password" onChange={(event) => updateField("password", event.target.value)} required type="password" value={form.password} />
          <small>Минимум 8 символов.</small>
        </label>
        <label className="field">
          <span>Имя</span>
          <input autoComplete="given-name" name="firstName" onChange={(event) => updateField("firstName", event.target.value)} required value={form.firstName} />
        </label>
        <label className="field">
          <span>Фамилия</span>
          <input autoComplete="family-name" name="lastName" onChange={(event) => updateField("lastName", event.target.value)} required value={form.lastName} />
        </label>
        <label className="field">
          <span>Username</span>
          <input autoComplete="username" minLength={3} name="username" onChange={(event) => updateField("username", event.target.value)} pattern="[a-zA-Z0-9_.]+" placeholder="alex_dev" required value={form.username} />
        </label>
        <label className="field">
          <span>Дата рождения</span>
          <input max={new Date().toISOString().slice(0, 10)} name="birthDate" onChange={(event) => updateField("birthDate", event.target.value)} type="date" value={form.birthDate} />
        </label>
        <label className="field field--full">
          <span>Телефон</span>
          <input autoComplete="tel" name="phone" onChange={(event) => updateField("phone", event.target.value)} pattern="\+[1-9][0-9]{7,14}" placeholder="+79991234567" type="tel" value={form.phone} />
          <small>Международный формат, например +79991234567.</small>
        </label>
      </div>

      <AvatarCropper onChange={setAvatar} onProcessingChange={setAvatarProcessing} onSelectionChange={setAvatarSelected} />

      <button className="button button--primary" disabled={loading || avatarUploading || avatarProcessing || (avatarSelected && !avatar)} type="submit">
        {avatarProcessing ? <Spinner label="Готовим фото…" /> : avatarUploading ? <Spinner label="Загружаем фото…" /> : loading ? <Spinner label="Создаём аккаунт…" /> : registeredAuth ? "Повторить загрузку фото" : "Создать аккаунт"}
      </button>

      <p className="form__footer">
        Уже зарегистрированы? <Link to="/login">Войти</Link>
      </p>
    </form>
  );
}
