import type { JSX } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

export interface TwTooltipProps {
  readonly label?: string;
  readonly tip?: string;
}

const triggerClass =
  "inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium hover:bg-[var(--muted)]";

const contentClass =
  "rounded-md bg-[var(--foreground)] px-2 py-1 text-xs text-[var(--background)] shadow";

function TooltipShell({
  label,
  tip,
  side,
}: {
  label: string;
  tip: string;
  side: "top" | "bottom" | "left" | "right";
}): JSX.Element {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root defaultOpen>
        <Tooltip.Trigger className={triggerClass}>{label}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side={side} sideOffset={6} className={contentClass}>
            {tip}
            <Tooltip.Arrow className="fill-[var(--foreground)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export function TwTooltip(props: TwTooltipProps = {}): JSX.Element {
  const { label = "Hover me", tip = "Add to library" } = props;
  return <TooltipShell label={label} tip={tip} side="top" />;
}

export function TwTooltipTop(_props: TwTooltipProps = {}): JSX.Element {
  return <TooltipShell label="Top" tip="Tooltip on top" side="top" />;
}

export function TwTooltipBottom(_props: TwTooltipProps = {}): JSX.Element {
  return <TooltipShell label="Bottom" tip="Tooltip on bottom" side="bottom" />;
}
