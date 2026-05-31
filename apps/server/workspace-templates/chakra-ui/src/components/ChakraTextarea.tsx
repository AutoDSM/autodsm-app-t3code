import { Textarea } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraTextareaProps {
  readonly placeholder?: string;
}

export function ChakraTextarea(props: ChakraTextareaProps): JSX.Element {
  const { placeholder = "Tell us about your design system..." } = props;
  return (
    <ChakraPreviewShell>
      <Textarea placeholder={placeholder} rows={4} />
    </ChakraPreviewShell>
  );
}

export interface ChakraTextareaVariantProps {
  readonly placeholder?: string;
}

export function ChakraTextareaFilled(props: ChakraTextareaVariantProps): JSX.Element {
  const { placeholder = "Write a release note..." } = props;
  return (
    <ChakraPreviewShell>
      <Textarea variant="filled" placeholder={placeholder} rows={4} />
    </ChakraPreviewShell>
  );
}

export function ChakraTextareaOutline(props: ChakraTextareaVariantProps): JSX.Element {
  const { placeholder = "Add a description..." } = props;
  return (
    <ChakraPreviewShell>
      <Textarea variant="outline" placeholder={placeholder} rows={4} />
    </ChakraPreviewShell>
  );
}
