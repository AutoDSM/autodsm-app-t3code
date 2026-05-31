import { Input } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraInputProps {
  readonly placeholder?: string;
  readonly size?: "sm" | "md" | "lg";
}

export function ChakraInput(props: ChakraInputProps): JSX.Element {
  const { placeholder = "you@example.com", size = "md" } = props;
  return (
    <ChakraPreviewShell>
      <Input placeholder={placeholder} size={size} />
    </ChakraPreviewShell>
  );
}

export interface ChakraInputVariantProps {
  readonly placeholder?: string;
  readonly size?: "sm" | "md" | "lg";
}

export function ChakraInputFilled(props: ChakraInputVariantProps): JSX.Element {
  const { placeholder = "you@example.com", size = "md" } = props;
  return (
    <ChakraPreviewShell>
      <Input variant="filled" placeholder={placeholder} size={size} />
    </ChakraPreviewShell>
  );
}

export function ChakraInputOutline(props: ChakraInputVariantProps): JSX.Element {
  const { placeholder = "you@example.com", size = "md" } = props;
  return (
    <ChakraPreviewShell>
      <Input variant="outline" placeholder={placeholder} size={size} />
    </ChakraPreviewShell>
  );
}

export function ChakraInputFlushed(props: ChakraInputVariantProps): JSX.Element {
  const { placeholder = "you@example.com", size = "md" } = props;
  return (
    <ChakraPreviewShell>
      <Input variant="flushed" placeholder={placeholder} size={size} />
    </ChakraPreviewShell>
  );
}

export function ChakraInputUnstyled(props: ChakraInputVariantProps): JSX.Element {
  const { placeholder = "you@example.com", size = "md" } = props;
  return (
    <ChakraPreviewShell>
      <Input variant="unstyled" placeholder={placeholder} size={size} />
    </ChakraPreviewShell>
  );
}
