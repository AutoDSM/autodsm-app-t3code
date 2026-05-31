import type { JSX } from "react";
import * as Progress from "@radix-ui/react-progress";

export interface TwProgressProps {
  readonly value?: number;
}

export function TwProgress(props: TwProgressProps = {}): JSX.Element {
  const { value = 62 } = props;
  return (
    <Progress.Root
      value={value}
      className="relative h-2 w-64 overflow-hidden rounded-full bg-[var(--muted)]"
    >
      <Progress.Indicator
        className="h-full bg-[var(--primary,#4f46e5)] transition-transform"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </Progress.Root>
  );
}

export function TwProgressIndeterminate(_props: TwProgressProps = {}): JSX.Element {
  return (
    <Progress.Root className="relative h-2 w-64 overflow-hidden rounded-full bg-[var(--muted)]">
      <Progress.Indicator className="h-full w-1/3 animate-pulse bg-[var(--primary,#4f46e5)]" />
    </Progress.Root>
  );
}
