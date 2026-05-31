import type { JSX } from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

export interface TwAspectRatioProps {
  readonly ratio?: number;
  readonly label?: string;
}

export function TwAspectRatio(props: TwAspectRatioProps = {}): JSX.Element {
  const { ratio = 16 / 9, label = "16 / 9" } = props;
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-lg border border-[var(--border)]">
      <AspectRatioPrimitive.Root ratio={ratio}>
        <div className="flex h-full w-full items-center justify-center bg-[var(--muted)] text-sm font-medium text-[var(--foreground)]">
          {label}
        </div>
      </AspectRatioPrimitive.Root>
    </div>
  );
}

export function TwAspectRatioWide(_props: TwAspectRatioProps = {}): JSX.Element {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-lg border border-[var(--border)]">
      <AspectRatioPrimitive.Root ratio={21 / 9}>
        <div className="flex h-full w-full items-center justify-center bg-[var(--muted)] text-sm font-medium text-[var(--foreground)]">
          21 / 9
        </div>
      </AspectRatioPrimitive.Root>
    </div>
  );
}

export function TwAspectRatioSquare(_props: TwAspectRatioProps = {}): JSX.Element {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-lg border border-[var(--border)]">
      <AspectRatioPrimitive.Root ratio={1}>
        <div className="flex h-full w-full items-center justify-center bg-[var(--muted)] text-sm font-medium text-[var(--foreground)]">
          1 / 1
        </div>
      </AspectRatioPrimitive.Root>
    </div>
  );
}
