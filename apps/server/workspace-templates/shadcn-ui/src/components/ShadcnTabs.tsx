import { useState } from "react";
import type { JSX } from "react";

export interface ShadcnTabsProps {
  readonly tabs?: readonly string[];
  readonly defaultIndex?: number;
  readonly orientation?: "horizontal" | "vertical";
}

export function ShadcnTabs(props: ShadcnTabsProps): JSX.Element {
  const tabs = props.tabs ?? ["Overview", "Activity", "Settings"];
  const orientation = props.orientation ?? "horizontal";
  const [active, setActive] = useState(props.defaultIndex ?? 0);

  if (orientation === "vertical") {
    return (
      <div className="flex gap-4">
        <div
          role="tablist"
          aria-orientation="vertical"
          className="flex flex-col gap-1 rounded-md bg-[var(--muted)] p-1"
        >
          {tabs.map((label, i) => {
            const isActive = i === active;
            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(i)}
                className={`rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--foreground)] opacity-70 hover:opacity-100"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 text-sm text-[var(--foreground)]">
          Content for <strong>{tabs[active]}</strong>.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div role="tablist" className="inline-flex gap-1 rounded-md bg-[var(--muted)] p-1">
        {tabs.map((label, i) => {
          const isActive = i === active;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(i)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--foreground)] opacity-70 hover:opacity-100"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="mt-4 text-sm text-[var(--foreground)]">
        Content for <strong>{tabs[active]}</strong>.
      </div>
    </div>
  );
}

export const ShadcnTabsVertical = (props: Omit<ShadcnTabsProps, "orientation">): JSX.Element => (
  <ShadcnTabs {...props} orientation="vertical" />
);
