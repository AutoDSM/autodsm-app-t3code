import type { JSX } from "react";

export interface UtilityStripProps {
  readonly label?: string;
}

/** Tailwind utility strip — styled via preview runtime CSS for interactive preview. */
export function UtilityStrip(props: UtilityStripProps): JSX.Element {
  const { label = "Tailwind CSS" } = props;
  return (
    <button type="button" className="preview-strip">
      <span className="preview-strip-label">{label}</span>
    </button>
  );
}
