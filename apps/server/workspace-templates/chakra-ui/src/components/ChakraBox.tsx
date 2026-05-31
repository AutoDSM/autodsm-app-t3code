import { Box } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraBoxProps {
  readonly label?: string;
}

export function ChakraBox(props: ChakraBoxProps): JSX.Element {
  const { label = "Basic Box container" } = props;
  return (
    <ChakraPreviewShell>
      <Box p={4} bg="purple.50" color="purple.800" borderRadius="md">
        {label}
      </Box>
    </ChakraPreviewShell>
  );
}

export interface ChakraBoxVariantProps {
  readonly label?: string;
}

export function ChakraBoxBordered(props: ChakraBoxVariantProps): JSX.Element {
  const { label = "Bordered Box" } = props;
  return (
    <ChakraPreviewShell>
      <Box p={4} borderWidth="1px" borderColor="gray.200" borderRadius="md">
        {label}
      </Box>
    </ChakraPreviewShell>
  );
}

export function ChakraBoxRaised(props: ChakraBoxVariantProps): JSX.Element {
  const { label = "Raised Box" } = props;
  return (
    <ChakraPreviewShell>
      <Box p={4} bg="white" borderRadius="md" boxShadow="md">
        {label}
      </Box>
    </ChakraPreviewShell>
  );
}
