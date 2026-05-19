import type { JSX } from "react";

export interface GradientHeadingProps {
  readonly label?: string;
}

export function GradientHeading(props: GradientHeadingProps): JSX.Element {
  const { label = "Design tokens" } = props;
  return (
    <h2 className="preview-heading" tabIndex={0}>
      {label}
    </h2>
  );
}
