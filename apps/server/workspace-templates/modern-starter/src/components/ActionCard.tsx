import type { JSX } from "react";

export interface ActionCardProps {
  readonly title?: string;
  readonly disabled?: boolean;
}

export function ActionCard(props: ActionCardProps): JSX.Element {
  const { title = "Action", disabled = false } = props;
  return (
    <button type="button" className="preview-btn" disabled={disabled}>
      {title}
    </button>
  );
}
