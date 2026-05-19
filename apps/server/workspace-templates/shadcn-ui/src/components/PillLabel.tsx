import type { JSX } from "react";

export interface PillLabelProps {
  readonly label?: string;
}

export function PillLabel(props: PillLabelProps): JSX.Element {
  const { label = "Design system" } = props;
  return <span className="preview-pill">{label}</span>;
}
