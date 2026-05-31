import { Tag, TagLabel, TagLeftIcon, Icon } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

const CHECK_PATH = "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z";

function CheckIcon(): JSX.Element {
  return (
    <Icon viewBox="0 0 24 24">
      <path fill="currentColor" d={CHECK_PATH} />
    </Icon>
  );
}

export interface ChakraTagProps {
  readonly label?: string;
  readonly colorScheme?: string;
}

export function ChakraTag(props: ChakraTagProps): JSX.Element {
  const { label = "Beta", colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <Tag colorScheme={colorScheme}>
        <TagLeftIcon as={CheckIcon as unknown as React.ComponentType} />
        <TagLabel>{label}</TagLabel>
      </Tag>
    </ChakraPreviewShell>
  );
}

export interface ChakraTagVariantProps {
  readonly label?: string;
  readonly colorScheme?: string;
}

export function ChakraTagSubtle(props: ChakraTagVariantProps): JSX.Element {
  const { label = "Subtle", colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <Tag variant="subtle" colorScheme={colorScheme}>
        {label}
      </Tag>
    </ChakraPreviewShell>
  );
}

export function ChakraTagSolid(props: ChakraTagVariantProps): JSX.Element {
  const { label = "Solid", colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <Tag variant="solid" colorScheme={colorScheme}>
        {label}
      </Tag>
    </ChakraPreviewShell>
  );
}

export function ChakraTagOutline(props: ChakraTagVariantProps): JSX.Element {
  const { label = "Outline", colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <Tag variant="outline" colorScheme={colorScheme}>
        {label}
      </Tag>
    </ChakraPreviewShell>
  );
}
