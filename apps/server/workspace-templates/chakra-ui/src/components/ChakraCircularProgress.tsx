import { CircularProgress, CircularProgressLabel } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraCircularProgressProps {
  readonly value?: number;
  readonly color?: string;
}

export function ChakraCircularProgress(props: ChakraCircularProgressProps): JSX.Element {
  const { value = 64, color = "purple.500" } = props;
  return (
    <ChakraPreviewShell>
      <CircularProgress value={value} color={color} size="80px">
        <CircularProgressLabel>{value}%</CircularProgressLabel>
      </CircularProgress>
    </ChakraPreviewShell>
  );
}

export interface ChakraCircularProgressVariantProps {
  readonly color?: string;
}

export function ChakraCircularProgressIndeterminate(
  props: ChakraCircularProgressVariantProps,
): JSX.Element {
  const { color = "purple.500" } = props;
  return (
    <ChakraPreviewShell>
      <CircularProgress isIndeterminate color={color} size="80px" />
    </ChakraPreviewShell>
  );
}
