import { Button } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraSolidButtonProps {
  readonly label?: string;
  readonly disabled?: boolean;
  readonly colorScheme?: string;
}

export function ChakraSolidButton(props: ChakraSolidButtonProps): JSX.Element {
  const { label = "Chakra UI", disabled = false, colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <Button colorScheme={colorScheme} isDisabled={disabled}>
        {label}
      </Button>
    </ChakraPreviewShell>
  );
}

export interface ChakraButtonVariantProps {
  readonly label?: string;
  readonly disabled?: boolean;
  readonly colorScheme?: string;
}

export function ChakraButtonSolid(props: ChakraButtonVariantProps): JSX.Element {
  const { label = "Solid", disabled = false, colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <Button variant="solid" colorScheme={colorScheme} isDisabled={disabled}>
        {label}
      </Button>
    </ChakraPreviewShell>
  );
}

export function ChakraButtonOutline(props: ChakraButtonVariantProps): JSX.Element {
  const { label = "Outline", disabled = false, colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <Button variant="outline" colorScheme={colorScheme} isDisabled={disabled}>
        {label}
      </Button>
    </ChakraPreviewShell>
  );
}

export function ChakraButtonGhost(props: ChakraButtonVariantProps): JSX.Element {
  const { label = "Ghost", disabled = false, colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <Button variant="ghost" colorScheme={colorScheme} isDisabled={disabled}>
        {label}
      </Button>
    </ChakraPreviewShell>
  );
}

export function ChakraButtonLink(props: ChakraButtonVariantProps): JSX.Element {
  const { label = "Link", disabled = false, colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <Button variant="link" colorScheme={colorScheme} isDisabled={disabled}>
        {label}
      </Button>
    </ChakraPreviewShell>
  );
}
