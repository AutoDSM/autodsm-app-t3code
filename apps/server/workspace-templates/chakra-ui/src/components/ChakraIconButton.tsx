import { IconButton, Icon } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

const SEARCH_PATH =
  "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z";

function SearchIcon(): JSX.Element {
  return (
    <Icon viewBox="0 0 24 24">
      <path fill="currentColor" d={SEARCH_PATH} />
    </Icon>
  );
}

export interface ChakraIconButtonProps {
  readonly ariaLabel?: string;
  readonly colorScheme?: string;
}

export function ChakraIconButton(props: ChakraIconButtonProps): JSX.Element {
  const { ariaLabel = "Search", colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <IconButton aria-label={ariaLabel} icon={<SearchIcon />} colorScheme={colorScheme} />
    </ChakraPreviewShell>
  );
}

export interface ChakraIconButtonVariantProps {
  readonly ariaLabel?: string;
}

export function ChakraIconButtonGhost(props: ChakraIconButtonVariantProps): JSX.Element {
  const { ariaLabel = "Search" } = props;
  return (
    <ChakraPreviewShell>
      <IconButton aria-label={ariaLabel} icon={<SearchIcon />} variant="ghost" />
    </ChakraPreviewShell>
  );
}

export function ChakraIconButtonOutline(props: ChakraIconButtonVariantProps): JSX.Element {
  const { ariaLabel = "Search" } = props;
  return (
    <ChakraPreviewShell>
      <IconButton aria-label={ariaLabel} icon={<SearchIcon />} variant="outline" />
    </ChakraPreviewShell>
  );
}
