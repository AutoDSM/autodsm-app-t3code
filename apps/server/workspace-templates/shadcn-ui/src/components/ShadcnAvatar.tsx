import type { JSX } from "react";

export interface ShadcnAvatarProps {
  readonly initials?: string;
  readonly size?: number;
}

export function ShadcnAvatar(props: ShadcnAvatarProps): JSX.Element {
  const { initials = "AD", size = 40 } = props;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-[var(--muted)] text-sm font-semibold text-[var(--foreground)]"
      style={{ width: size, height: size }}
    >
      {initials.slice(0, 2).toUpperCase()}
    </span>
  );
}
