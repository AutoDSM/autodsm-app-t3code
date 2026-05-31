import { useState } from "react";
import type { JSX } from "react";

export interface ShadcnPaginationProps {
  readonly totalPages?: number;
  readonly compact?: boolean;
  readonly defaultPage?: number;
}

export function ShadcnPagination(props: ShadcnPaginationProps): JSX.Element {
  const { totalPages = 10, compact = false, defaultPage = 1 } = props;
  const [page, setPage] = useState(defaultPage);

  const itemClass =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-transparent px-3 text-sm text-[var(--foreground)] hover:bg-[var(--muted)]";
  const activeClass =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-medium text-[var(--foreground)] shadow-sm";

  if (compact) {
    return (
      <nav aria-label="pagination" className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className={itemClass}
          disabled={page === 1}
        >
          ‹ Previous
        </button>
        <span className="text-sm text-[var(--foreground)]">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className={itemClass}
          disabled={page === totalPages}
        >
          Next ›
        </button>
      </nav>
    );
  }

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <nav aria-label="pagination" className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className={itemClass}
        disabled={page === 1}
      >
        ‹ Previous
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm opacity-60">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => setPage(p)}
            className={p === page ? activeClass : itemClass}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        className={itemClass}
        disabled={page === totalPages}
      >
        Next ›
      </button>
    </nav>
  );
}

export const ShadcnPaginationCompact = (
  props: Omit<ShadcnPaginationProps, "compact">,
): JSX.Element => <ShadcnPagination {...props} compact />;
