import type { JSX } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

export interface TwLabelProps {
  readonly text?: string;
  readonly htmlFor?: string;
}

export function TwLabel(props: TwLabelProps = {}): JSX.Element {
  const { text = "Email", htmlFor = "email" } = props;
  return (
    <LabelPrimitive.Root htmlFor={htmlFor} className="text-sm font-medium text-[var(--foreground)]">
      {text}
    </LabelPrimitive.Root>
  );
}
