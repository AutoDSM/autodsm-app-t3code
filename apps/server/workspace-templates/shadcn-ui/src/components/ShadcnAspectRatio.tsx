import type { JSX, ReactNode } from "react";

export interface ShadcnAspectRatioProps {
  readonly ratio?: number;
  readonly children?: ReactNode;
  readonly imageUrl?: string;
}

export function ShadcnAspectRatio(props: ShadcnAspectRatioProps): JSX.Element {
  const { ratio = 16 / 9, children, imageUrl } = props;
  return (
    <div
      className="relative w-full overflow-hidden rounded-md bg-[var(--muted)]"
      style={{ aspectRatio: String(ratio) }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--foreground)] opacity-60">
          {children ?? `${ratio.toFixed(2)}:1`}
        </div>
      )}
    </div>
  );
}

export const ShadcnAspectRatioWide = (
  props: Omit<ShadcnAspectRatioProps, "ratio">,
): JSX.Element => <ShadcnAspectRatio {...props} ratio={16 / 9} />;

export const ShadcnAspectRatioSquare = (
  props: Omit<ShadcnAspectRatioProps, "ratio">,
): JSX.Element => <ShadcnAspectRatio {...props} ratio={1} />;
