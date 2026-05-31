import { useState } from "react";
import type { JSX } from "react";

export interface ShadcnSidebarNavItem {
  readonly label: string;
  readonly icon?: string;
  readonly href?: string;
}

export interface ShadcnSidebarProps {
  readonly title?: string;
  readonly items?: readonly ShadcnSidebarNavItem[];
}

const DEFAULT_ITEMS: readonly ShadcnSidebarNavItem[] = [
  { label: "Home", icon: "🏠" },
  { label: "Inbox", icon: "📥" },
  { label: "Calendar", icon: "📅" },
  { label: "Search", icon: "🔎" },
  { label: "Settings", icon: "⚙️" },
];

export function ShadcnSidebar(props: ShadcnSidebarProps): JSX.Element {
  const items = props.items ?? DEFAULT_ITEMS;
  const [active, setActive] = useState(items[0]?.label ?? "");
  return (
    <aside className="flex h-96 w-60 flex-col border-r border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]">
      <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
        {props.title ?? "Application"}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        <p className="px-2 pb-1 pt-2 text-xs font-medium uppercase opacity-60">Main</p>
        {items.map((item) => {
          const isActive = item.label === active;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => setActive(item.label)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                isActive
                  ? "bg-[var(--muted)] font-medium text-[var(--foreground)]"
                  : "text-[var(--foreground)] opacity-80 hover:bg-[var(--muted)] hover:opacity-100"
              }`}
            >
              {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="border-t border-[var(--border)] p-3 text-xs opacity-70">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-[var(--muted)]" />
          <div>
            <p className="font-medium text-[var(--foreground)]">shadcn</p>
            <p>m@example.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
