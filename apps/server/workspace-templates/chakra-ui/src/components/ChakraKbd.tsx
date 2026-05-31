import { HStack, Kbd, Text } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraKbdProps {
  readonly hint?: string;
}

export function ChakraKbd(props: ChakraKbdProps): JSX.Element {
  const { hint = "to open the command menu" } = props;
  return (
    <ChakraPreviewShell>
      <HStack spacing={2}>
        <Kbd>shift</Kbd>
        <Text>+</Text>
        <Kbd>H</Kbd>
        <Text fontSize="sm" color="gray.600">
          {hint}
        </Text>
      </HStack>
    </ChakraPreviewShell>
  );
}
