import { useState } from "react";
import type { JSX } from "react";

export interface ShadcnAccordionItem {
  readonly title: string;
  readonly content: string;
}

export interface ShadcnAccordionProps {
  readonly items?: readonly ShadcnAccordionItem[];
}

const DEFAULT_ITEMS: readonly ShadcnAccordionItem[] = [
  { title: "Is it accessible?", content: "Yes. It adheres to the WAI-ARIA design pattern." },
  { title: "Is it themable?", content: "Yes. It uses design tokens for colors and spacing." },
];

export function ShadcnAccordion(props: ShadcnAccordionProps): JSX.Element {
  const items = props.items ?? DEFAULT_ITEMS;
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.title}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]"
              aria-expanded={isOpen}
            >
              {item.title}
              <span aria-hidden>{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen ? (
              <div className="px-4 pb-3 text-sm text-[var(--foreground)] opacity-80">
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
