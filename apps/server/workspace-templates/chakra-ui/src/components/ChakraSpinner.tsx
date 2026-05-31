import { Spinner } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraSpinnerProps {
  readonly size?: "xs" | "sm" | "md" | "lg" | "xl";
  readonly color?: string;
}

export function ChakraSpinner(props: ChakraSpinnerProps): JSX.Element {
  const { size = "lg", color = "purple.500" } = props;
  return (
    <ChakraPreviewShell>
      <Spinner size={size} color={color} thickness="4px" />
    </ChakraPreviewShell>
  );
}

export interface ChakraSpinnerVariantProps {
  readonly color?: string;
}

export function ChakraSpinnerSm(props: ChakraSpinnerVariantProps): JSX.Element {
  const { color = "purple.500" } = props;
  return (
    <ChakraPreviewShell>
      <Spinner size="sm" color={color} />
    </ChakraPreviewShell>
  );
}

export function ChakraSpinnerLg(props: ChakraSpinnerVariantProps): JSX.Element {
  const { color = "purple.500" } = props;
  return (
    <ChakraPreviewShell>
      <Spinner size="lg" color={color} thickness="4px" />
    </ChakraPreviewShell>
  );
}

export function ChakraSpinnerXl(props: ChakraSpinnerVariantProps): JSX.Element {
  const { color = "purple.500" } = props;
  return (
    <ChakraPreviewShell>
      <Spinner size="xl" color={color} thickness="4px" />
    </ChakraPreviewShell>
  );
}
