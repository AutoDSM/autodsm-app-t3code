import { HStack, Box } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraHStackProps {
  readonly spacing?: number;
}

export function ChakraHStack(props: ChakraHStackProps): JSX.Element {
  const { spacing = 3 } = props;
  return (
    <ChakraPreviewShell>
      <HStack spacing={spacing}>
        <Box bg="purple.100" px={3} py={2} borderRadius="md">
          Alpha
        </Box>
        <Box bg="purple.100" px={3} py={2} borderRadius="md">
          Bravo
        </Box>
        <Box bg="purple.100" px={3} py={2} borderRadius="md">
          Charlie
        </Box>
      </HStack>
    </ChakraPreviewShell>
  );
}
