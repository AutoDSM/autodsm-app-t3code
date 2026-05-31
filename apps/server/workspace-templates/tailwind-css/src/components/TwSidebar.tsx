import type { JSX } from "react";

export interface TwSidebarProps {
  readonly title?: string;
}

const SECTIONS: ReadonlyArray<{ readonly heading: string; readonly items: ReadonlyArray<string> }> =
  [
    { heading: "Platform", items: ["Playground", "Models", "Documentation", "Settings"] },
    { heading: "Projects", items: ["Design Engineering", "Sales & Marketing", "Travel"] },
  ];

export function TwSidebar(props: TwSidebarProps = {}): JSX.Element {
  const { title = "AutoDSM" } = props;
  return (
    <aside className="flex h-80 w-60 flex-col rounded-lg border border-[var(--border)] bg-[var(--background)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
        <p className="text-xs opacity-60">Workspace</p>
      </div>
      <nav className="flex-1 overflow-auto p-2 text-sm text-[var(--foreground)]">
        {SECTIONS.map((section) => (
          <div key={section.heading} className="mb-3">
            <p className="px-2 pb-1 text-xs uppercase tracking-wide opacity-50">
              {section.heading}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item}>
                  <a href="#" className="block rounded px-2 py-1.5 hover:bg-[var(--muted)]">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
