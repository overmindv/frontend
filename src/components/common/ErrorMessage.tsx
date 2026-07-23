export function ErrorMessage({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="message message--error" role="alert">
      Не удалось выполнить действие. Попробуйте ещё раз.
    </div>
  );
}
