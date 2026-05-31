import { Center, Box } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraCenterProps {
  readonly label?: string;
}

export function ChakraCenter(props: ChakraCenterProps): JSX.Element {
  const { label = "Centered" } = props;
  return (
    <ChakraPreviewShell>
      <Center h="120px" w="100%" bg="purple.50" borderRadius="md">
        <Box px={4} py={2} bg="white" borderRadius="md" boxShadow="sm">
          {label}
        </Box>
      </Center>
    </ChakraPreviewShell>
  );
}
