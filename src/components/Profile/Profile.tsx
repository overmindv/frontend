import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { uploadAvatar } from "../../api/media";
import { GET_USER_QUERY } from "../../api/queries";
import { UPDATE_USER_MUTATION } from "../../api/mutations";
import { getErrorMessage } from "../../api/errors";
import type { UpdateUserInput, User } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { ErrorMessage } from "../common/ErrorMessage";
import { Spinner } from "../common/Spinner";

interface GetUserData {
  getUser: User;
}

interface UpdateUserData {
  updateUser: User;
}

interface ProfileForm {
  username: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
}

const emptyForm: ProfileForm = {
  username: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  phone: "",
};

function userToForm(user: User): ProfileForm {
  return {
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    birthDate: user.birthDate ?? "",
    phone: user.phone ?? "",
  };
}

export function Profile() {
  const { userId, logout } = useAuth();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { data, loading, error, refetch: refetchUser } = useQuery<
    GetUserData,
    { id: string }
  >(GET_USER_QUERY, {
    variables: { id: userId ?? "" },
    skip: !userId,
    fetchPolicy: "cache-and-network",
  });
  const [updateUser, { loading: saving }] = useMutation<
    UpdateUserData,
    { id: string; input: UpdateUserInput }
  >(UPDATE_USER_MUTATION);

  const user = data?.getUser;

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) setForm(userToForm(user));
  }, [user]);

  const handleAvatarChange = (file: File | null) => {
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarError(null);
    setSuccessMessage(null);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarSubmit = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    setAvatarError(null);
    setSuccessMessage(null);
    try {
      await uploadAvatar(avatarFile);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      setAvatarFile(null);
      await refetchUser();
      setSuccessMessage("Аватар сохранён.");
    } catch (avatarSubmitError) {
      setAvatarError(getErrorMessage(avatarSubmitError));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const updateField = (field: keyof ProfileForm, value: string) => {
    setSuccessMessage(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !userId) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    const initial = userToForm(user);
    const input: UpdateUserInput = {};

    if (form.username.trim() !== initial.username) input.username = form.username.trim();
    if (form.firstName.trim() !== initial.firstName) input.firstName = form.firstName.trim();
    if (form.lastName.trim() !== initial.lastName) input.lastName = form.lastName.trim();
    if (form.phone.trim() !== initial.phone) input.phone = form.phone.trim();
    if (form.birthDate !== initial.birthDate) {
      if (form.birthDate) input.birthDate = form.birthDate;
      else input.clearBirthDate = true;
    }

    if (Object.keys(input).length === 0) {
      setSuccessMessage("Изменений нет.");
      return;
    }

    try {
      const result = await updateUser({ variables: { id: userId, input } });
      if (!result.data?.updateUser) throw new Error("Сервер вернул пустой ответ.");
      setForm(userToForm(result.data.updateUser));
      setSuccessMessage("Профиль сохранён.");
    } catch (mutationError) {
      setErrorMessage(getErrorMessage(mutationError));
    }
  };

  if (loading && !user) {
    return <div className="panel panel--center"><Spinner label="Загружаем профиль…" /></div>;
  }

  if (error && !user) {
    return <div className="panel"><ErrorMessage message={getErrorMessage(error)} /></div>;
  }

  if (!user) return null;

  return (
    <section className="profile-layout">
      <aside className="profile-summary">
        {avatarPreview || user.avatar?.smallUrl || user.avatar?.mediumUrl ? (
          <img
            className="avatar avatar-image"
            src={avatarPreview || user.avatar?.mediumUrl || user.avatar?.smallUrl || ""}
            alt="Аватар"
          />
        ) : (
          <div className="avatar" aria-hidden="true">
            {(user.firstName || user.username).slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="avatar-upload">
          <input
            ref={avatarInputRef}
            accept="image/jpeg,image/png,image/webp"
            className="avatar-upload__input"
            type="file"
            onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
          />
          <button className="button button--ghost button--small" onClick={() => avatarInputRef.current?.click()} type="button">
            {avatarPreview ? "Выбрать другой файл" : "Загрузить аватар"}
          </button>
          {avatarFile && (
            <button className="button button--primary button--small" disabled={uploadingAvatar} onClick={handleAvatarSubmit} type="button">
              {uploadingAvatar ? <Spinner label="Сохраняем…" /> : "Сохранить аватар"}
            </button>
          )}
          {avatarError && <ErrorMessage message={avatarError} />}
        </div>

        <div>
          <span className="eyebrow">Ваш аккаунт</span>
          <h1>{[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username}</h1>
          <p>@{user.username}</p>
        </div>
        <dl className="profile-meta">
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Создан</dt><dd>{new Date(user.createdAt).toLocaleDateString("ru-RU")}</dd></div>
        </dl>
        <button className="button button--ghost" onClick={logout} type="button">Выйти из аккаунта</button>
      </aside>

      <form className="form form--profile" onSubmit={handleSubmit}>
        <div className="form__heading">
          <span className="eyebrow">Настройки</span>
          <h2>Данные профиля</h2>
          <p>Почта используется для входа и пока не редактируется.</p>
        </div>

        <ErrorMessage message={errorMessage} />
        {successMessage && <div className="message message--success" role="status">{successMessage}</div>}

        <div className="form-grid">
          <label className="field field--full">
            <span>Электронная почта</span>
            <input disabled type="email" value={user.email} />
          </label>
          <label className="field">
            <span>Имя</span>
            <input autoComplete="given-name" onChange={(event) => updateField("firstName", event.target.value)} value={form.firstName} />
          </label>
          <label className="field">
            <span>Фамилия</span>
            <input autoComplete="family-name" onChange={(event) => updateField("lastName", event.target.value)} value={form.lastName} />
          </label>
          <label className="field field--full">
            <span>Username</span>
            <input autoComplete="username" minLength={3} onChange={(event) => updateField("username", event.target.value)} pattern="[a-zA-Z0-9_.]+" required value={form.username} />
          </label>
          <label className="field">
            <span>Дата рождения</span>
            <input max={new Date().toISOString().slice(0, 10)} onChange={(event) => updateField("birthDate", event.target.value)} type="date" value={form.birthDate} />
          </label>
          <label className="field">
            <span>Телефон</span>
            <input autoComplete="tel" onChange={(event) => updateField("phone", event.target.value)} pattern="\+[1-9][0-9]{7,14}" placeholder="+79991234567" type="tel" value={form.phone} />
          </label>
        </div>

        <button className="button button--primary" disabled={saving} type="submit">
          {saving ? <Spinner label="Сохраняем…" /> : "Сохранить изменения"}
        </button>
      </form>
    </section>
  );
}
