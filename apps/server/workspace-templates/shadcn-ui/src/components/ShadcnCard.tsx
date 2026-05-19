import type { JSX, ReactNode } from "react";

export interface ShadcnCardProps {
  readonly title?: string;
  readonly children?: ReactNode;
  readonly actionLabel?: string;
}

/** Shadcn-style card container for content blocks. */
export function ShadcnCard(props: ShadcnCardProps): JSX.Element {
  const { title = "Card title", children, actionLabel = "Action" } = props;
  return (
    <div className="preview-card">
      <p className="preview-card-title">{title}</p>
      <p className="preview-card-body">{children ?? "Card content goes here."}</p>
      <button type="button" className="preview-btn preview-btn-ghost preview-card-action">
        {actionLabel}
      </button>
    </div>
  );
}
