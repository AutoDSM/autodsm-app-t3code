import type { JSX } from "react";
import * as Accordion from "@radix-ui/react-accordion";

export interface TwAccordionProps {
  readonly title?: string;
}

const ITEMS = [
  {
    value: "item-1",
    title: "What is AutoDSM?",
    body: "An AI-powered design system manager that keeps your tokens in sync.",
  },
  {
    value: "item-2",
    title: "How does theming work?",
    body: "Themes are defined as CSS custom properties consumed by Tailwind utilities.",
  },
  {
    value: "item-3",
    title: "Is it accessible?",
    body: "Yes — Radix primitives ship keyboard navigation and ARIA semantics out of the box.",
  },
];

export function TwAccordion(_props: TwAccordionProps = {}): JSX.Element {
  return (
    <Accordion.Root
      type="single"
      defaultValue="item-1"
      collapsible
      className="w-full max-w-md divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--background)]"
    >
      {ITEMS.map((item) => (
        <Accordion.Item key={item.value} value={item.value}>
          <Accordion.Header>
            <Accordion.Trigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] data-[state=open]:bg-[var(--muted)]">
              <span>{item.title}</span>
              <span aria-hidden="true" className="text-xs">
                ▾
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 pb-3 text-sm text-[var(--muted-foreground,var(--foreground))]">
            {item.body}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

export function TwAccordionMulti(_props: TwAccordionProps = {}): JSX.Element {
  return (
    <Accordion.Root
      type="multiple"
      defaultValue={["item-1", "item-2"]}
      className="w-full max-w-md divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--background)]"
    >
      {ITEMS.map((item) => (
        <Accordion.Item key={item.value} value={item.value}>
          <Accordion.Header>
            <Accordion.Trigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] data-[state=open]:bg-[var(--muted)]">
              <span>{item.title}</span>
              <span aria-hidden="true" className="text-xs">
                ▾
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 pb-3 text-sm text-[var(--muted-foreground,var(--foreground))]">
            {item.body}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
