import type { JSX } from "react";
import * as Switch from "@radix-ui/react-switch";

export interface TwSwitchProps {
  readonly label?: string;
}

const rootClass =
  "relative h-5 w-9 rounded-full bg-[var(--muted)] transition data-[state=checked]:bg-[var(--primary,#4f46e5)] data-[disabled]:opacity-50";
const thumbClass =
  "block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]";

export function TwSwitch(props: TwSwitchProps = {}): JSX.Element {
  const { label = "Airplane mode" } = props;
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
      <Switch.Root className={rootClass}>
        <Switch.Thumb className={thumbClass} />
      </Switch.Root>
      {label}
    </label>
  );
}

export function TwSwitchChecked(props: TwSwitchProps = {}): JSX.Element {
  const { label = "Notifications" } = props;
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
      <Switch.Root defaultChecked className={rootClass}>
        <Switch.Thumb className={thumbClass} />
      </Switch.Root>
      {label}
    </label>
  );
}

export function TwSwitchDisabled(props: TwSwitchProps = {}): JSX.Element {
  const { label = "Disabled" } = props;
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)] opacity-60">
      <Switch.Root disabled className={rootClass}>
        <Switch.Thumb className={thumbClass} />
      </Switch.Root>
      {label}
    </label>
  );
}
