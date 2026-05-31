import type { JSX } from "react";

export interface TwPaginationProps {
  readonly current?: number;
  readonly total?: number;
}

const itemBase =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-[var(--border)] px-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)]";
const itemActive =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-[var(--primary,#4f46e5)] px-2 text-sm font-medium text-white";

export function TwPagination(props: TwPaginationProps = {}): JSX.Element {
  const { current = 2, total = 5 } = props;
  return (
    <nav aria-label="Pagination" className="inline-flex items-center gap-1">
      <a href="#" className={itemBase}>
        ‹ Prev
      </a>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <a
          key={n}
          href="#"
          aria-current={n === current ? "page" : undefined}
          className={n === current ? itemActive : itemBase}
        >
          {n}
        </a>
      ))}
      <a href="#" className={itemBase}>
        Next ›
      </a>
    </nav>
  );
}

export function TwPaginationCompact(props: TwPaginationProps = {}): JSX.Element {
  const { current = 3, total = 10 } = props;
  return (
    <nav
      aria-label="Pagination"
      className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]"
    >
      <a href="#" className={itemBase}>
        ‹
      </a>
      <span className="opacity-80">
        Page <span className="font-medium">{current}</span> of {total}
      </span>
      <a href="#" className={itemBase}>
        ›
      </a>
    </nav>
  );
}
