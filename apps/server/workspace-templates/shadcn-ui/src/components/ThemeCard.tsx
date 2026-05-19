import type { JSX } from "react";

export interface ThemeCardProps {
  readonly title?: string;
  readonly body?: string;
}

/** Shadcn-style primitives: utility-friendly card (tokens via preview CSS). */
export function ThemeCard(props: ThemeCardProps): JSX.Element {
  const {
    title = "Theme card",
    body = "Shadcn UI starter — extend with `shadcn` CLI components.",
  } = props;
  return (
    <div className="preview-card">
      <p className="preview-card-title">{title}</p>
      <p className="preview-card-body">{body}</p>
      <button type="button" className="preview-btn preview-btn-outline preview-card-action">
        Explore
      </button>
    </div>
  );
}
