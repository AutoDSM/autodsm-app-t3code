import { Text } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraTextProps {
  readonly children?: string;
  readonly fontSize?: string;
}

export function ChakraText(props: ChakraTextProps): JSX.Element {
  const { children = "Body text with default sizing.", fontSize = "md" } = props;
  return (
    <ChakraPreviewShell>
      <Text fontSize={fontSize}>{children}</Text>
    </ChakraPreviewShell>
  );
}

export interface ChakraTextVariantProps {
  readonly children?: string;
}

export function ChakraTextSm(props: ChakraTextVariantProps): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Text fontSize="sm">{props.children ?? "Small body copy"}</Text>
    </ChakraPreviewShell>
  );
}

export function ChakraTextMd(props: ChakraTextVariantProps): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Text fontSize="md">{props.children ?? "Medium body copy"}</Text>
    </ChakraPreviewShell>
  );
}

export function ChakraTextLg(props: ChakraTextVariantProps): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Text fontSize="lg">{props.children ?? "Large body copy"}</Text>
    </ChakraPreviewShell>
  );
}

export function ChakraTextXl(props: ChakraTextVariantProps): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Text fontSize="xl">{props.children ?? "Extra-large body copy"}</Text>
    </ChakraPreviewShell>
  );
}
