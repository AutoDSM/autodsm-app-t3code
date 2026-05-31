import { Heading } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraHeadingProps {
  readonly children?: string;
  readonly size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
}

export function ChakraHeading(props: ChakraHeadingProps): JSX.Element {
  const { children = "Heading", size = "lg" } = props;
  return (
    <ChakraPreviewShell>
      <Heading size={size}>{children}</Heading>
    </ChakraPreviewShell>
  );
}

export interface ChakraHeadingVariantProps {
  readonly children?: string;
}

export function ChakraHeadingH1(props: ChakraHeadingVariantProps): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Heading as="h1" size="2xl">
        {props.children ?? "Display heading"}
      </Heading>
    </ChakraPreviewShell>
  );
}

export function ChakraHeadingH2(props: ChakraHeadingVariantProps): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Heading as="h2" size="xl">
        {props.children ?? "Section heading"}
      </Heading>
    </ChakraPreviewShell>
  );
}

export function ChakraHeadingH3(props: ChakraHeadingVariantProps): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Heading as="h3" size="lg">
        {props.children ?? "Subsection heading"}
      </Heading>
    </ChakraPreviewShell>
  );
}

export function ChakraHeadingH4(props: ChakraHeadingVariantProps): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Heading as="h4" size="md">
        {props.children ?? "Card heading"}
      </Heading>
    </ChakraPreviewShell>
  );
}
