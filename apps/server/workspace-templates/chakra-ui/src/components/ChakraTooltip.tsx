import { Button, Tooltip } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraTooltipProps {
  readonly label?: string;
  readonly children?: string;
}

export function ChakraTooltip(props: ChakraTooltipProps): JSX.Element {
  const { label = "Open settings", children = "Settings" } = props;
  return (
    <ChakraPreviewShell>
      <Tooltip label={label} hasArrow isOpen>
        <Button colorScheme="purple">{children}</Button>
      </Tooltip>
    </ChakraPreviewShell>
  );
}

export interface ChakraTooltipVariantProps {
  readonly label?: string;
  readonly children?: string;
}

export function ChakraTooltipTop(props: ChakraTooltipVariantProps): JSX.Element {
  const { label = "Tooltip above", children = "Hover me" } = props;
  return (
    <ChakraPreviewShell>
      <Tooltip label={label} placement="top" hasArrow isOpen>
        <Button colorScheme="purple">{children}</Button>
      </Tooltip>
    </ChakraPreviewShell>
  );
}

export function ChakraTooltipBottom(props: ChakraTooltipVariantProps): JSX.Element {
  const { label = "Tooltip below", children = "Hover me" } = props;
  return (
    <ChakraPreviewShell>
      <Tooltip label={label} placement="bottom" hasArrow isOpen>
        <Button colorScheme="purple">{children}</Button>
      </Tooltip>
    </ChakraPreviewShell>
  );
}
