import type { JSX } from "react";

export interface ShadcnBreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

export interface ShadcnBreadcrumbProps {
  readonly items?: readonly ShadcnBreadcrumbItem[];
}

export function ShadcnBreadcrumb(props: ShadcnBreadcrumbProps): JSX.Element {
  const items = props.items ?? [
    { label: "Home", href: "#" },
    { label: "Components", href: "#" },
    { label: "Breadcrumb" },
  ];
  return (
    <nav aria-label="breadcrumb" className="text-sm text-[var(--foreground)]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="opacity-70 hover:text-[var(--foreground)] hover:opacity-100"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={isLast ? "font-medium text-[var(--foreground)]" : "opacity-70"}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? <span className="opacity-50">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
