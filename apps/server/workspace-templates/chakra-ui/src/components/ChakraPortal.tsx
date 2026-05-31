import { Box, Portal, Text } from "@chakra-ui/react";
import { useRef } from "react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraPortalProps {
  readonly label?: string;
}

export function ChakraPortal(props: ChakraPortalProps): JSX.Element {
  const { label = "I render inside the host below via Portal" } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  return (
    <ChakraPreviewShell>
      <Box>
        <Text mb={3}>Source location (logical parent)</Text>
        <Box
          ref={hostRef}
          p={4}
          borderWidth="1px"
          borderStyle="dashed"
          borderColor="purple.300"
          borderRadius="md"
          minH="80px"
        >
          <Text fontSize="sm" color="gray.500" mb={2}>
            Portal target
          </Text>
          <Portal containerRef={hostRef}>
            <Box
              bg="purple.500"
              color="white"
              px={3}
              py={2}
              borderRadius="md"
              display="inline-block"
            >
              {label}
            </Box>
          </Portal>
        </Box>
      </Box>
    </ChakraPreviewShell>
  );
}
