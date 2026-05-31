import type { JSX } from "react";

export interface TwBreadcrumbProps {
  readonly items?: ReadonlyArray<{ readonly label: string; readonly href?: string }>;
}

export function TwBreadcrumb(props: TwBreadcrumbProps = {}): JSX.Element {
  const {
    items = [
      { label: "Home", href: "#" },
      { label: "Components", href: "#" },
      { label: "Breadcrumb" },
    ],
  } = props;
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex items-center gap-1 text-[var(--foreground)] opacity-90">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="text-[var(--foreground)] opacity-70 hover:opacity-100"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="font-medium text-[var(--foreground)]"
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden="true" className="px-1 text-[var(--foreground)] opacity-40">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
