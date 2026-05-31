import { VStack, Box } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraVStackProps {
  readonly spacing?: number;
}

export function ChakraVStack(props: ChakraVStackProps): JSX.Element {
  const { spacing = 3 } = props;
  return (
    <ChakraPreviewShell>
      <VStack spacing={spacing} align="stretch" w="100%">
        <Box bg="purple.100" px={3} py={2} borderRadius="md">
          Stacked top
        </Box>
        <Box bg="purple.100" px={3} py={2} borderRadius="md">
          Stacked middle
        </Box>
        <Box bg="purple.100" px={3} py={2} borderRadius="md">
          Stacked bottom
        </Box>
      </VStack>
    </ChakraPreviewShell>
  );
}
