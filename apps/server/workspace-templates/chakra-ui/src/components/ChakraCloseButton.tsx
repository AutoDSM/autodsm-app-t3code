import { CloseButton } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraCloseButtonProps {
  readonly size?: "sm" | "md" | "lg";
}

export function ChakraCloseButton(props: ChakraCloseButtonProps): JSX.Element {
  const { size = "md" } = props;
  return (
    <ChakraPreviewShell>
      <CloseButton size={size} />
    </ChakraPreviewShell>
  );
}

export function ChakraCloseButtonSm(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <CloseButton size="sm" />
    </ChakraPreviewShell>
  );
}

export function ChakraCloseButtonLg(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <CloseButton size="lg" />
    </ChakraPreviewShell>
  );
}
