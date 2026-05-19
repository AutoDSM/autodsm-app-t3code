import type { JSX } from "react";

export interface WelcomeShellProps {
  readonly title?: string;
  readonly body?: string;
  readonly ctaLabel?: string;
}

export function WelcomeShell(props: WelcomeShellProps): JSX.Element {
  const {
    title = "Modern starter",
    body = "AutoDSM workspace — use the agent in this thread to edit components.",
    ctaLabel = "Get started",
  } = props;
  return (
    <div className="preview-shell">
      <h1 className="preview-shell-title">{title}</h1>
      <p className="preview-shell-body">{body}</p>
      <button type="button" className="preview-btn preview-shell-cta">
        {ctaLabel}
      </button>
    </div>
  );
}
