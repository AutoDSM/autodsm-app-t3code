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
