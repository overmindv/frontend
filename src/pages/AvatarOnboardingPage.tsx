import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { uploadAvatar } from "../api/media";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Spinner } from "../components/common/Spinner";

// AvatarOnboardingPage завершает выбранную при регистрации direct upload загрузку.
export function AvatarOnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const blob = (location.state as { avatar?: Blob } | null)?.avatar;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(blob));

  useEffect(() => {
    if (!blob) return;

    const controller = new AbortController();
    setLoading(true);
    // Отложенный запуск не создаёт лишнюю upload-сессию при проверочном remount в React StrictMode.
    const timeout = window.setTimeout(() => {
      void uploadAvatar(blob, controller.signal)
        .then(() => navigate("/profile", { replace: true }))
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;

          setError(reason instanceof Error ? reason.message : "Не удалось загрузить фото.");
          setLoading(false);
        });
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [blob, navigate]);

  return <main className="page-shell content-state"><h1>Фото профиля</h1><ErrorMessage message={error} />{loading ? <Spinner label="Проверяем и оптимизируем фото…" /> : <button className="button button--primary" onClick={() => navigate("/profile/settings", { replace: true })}>Попробовать в настройках</button>}<button className="button button--ghost" onClick={() => navigate("/profile", { replace: true })}>Пропустить</button></main>;
}
