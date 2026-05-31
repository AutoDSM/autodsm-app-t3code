import { Stack, Box } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraStackProps {
  readonly spacing?: number;
}

export function ChakraStack(props: ChakraStackProps): JSX.Element {
  const { spacing = 3 } = props;
  return (
    <ChakraPreviewShell>
      <Stack spacing={spacing} w="100%">
        <Box bg="purple.100" px={3} py={2} borderRadius="md">
          First item
        </Box>
        <Box bg="purple.100" px={3} py={2} borderRadius="md">
          Second item
        </Box>
        <Box bg="purple.100" px={3} py={2} borderRadius="md">
          Third item
        </Box>
      </Stack>
    </ChakraPreviewShell>
  );
}
