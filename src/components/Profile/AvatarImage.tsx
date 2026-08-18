import type { UserAvatar } from "../../api/types";

// AvatarImage отдаёт CDN-вариант нужного размера или fallback-инициал.
export function AvatarImage({ avatar, label, name, size = 128, lazy = false, eager = false }: { avatar: UserAvatar | null; label?: string; name?: string; size?: number; lazy?: boolean; eager?: boolean }) {
  const accessibleLabel = label ?? name ?? "Пользователь";

  if (!avatar) return <span className="avatar-fallback" aria-hidden="true">{accessibleLabel.slice(0, 1).toUpperCase()}</span>;

  return <img alt={`Фото ${accessibleLabel}`} decoding="async" height={size} loading={lazy && !eager ? "lazy" : "eager"} src={avatar.smallUrl} srcSet={`${avatar.smallUrl} 128w, ${avatar.mediumUrl} 768w`} sizes={`${size}px`} width={size} />;
}
