import { Flex, Box } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraFlexProps {
  readonly children?: JSX.Element;
}

function Tile({ label }: { label: string }): JSX.Element {
  return (
    <Box bg="purple.100" color="purple.800" px={3} py={2} borderRadius="md">
      {label}
    </Box>
  );
}

export function ChakraFlex(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Flex gap={2}>
        <Tile label="One" />
        <Tile label="Two" />
        <Tile label="Three" />
      </Flex>
    </ChakraPreviewShell>
  );
}

export function ChakraFlexCenter(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Flex justify="center" align="center" gap={2} h="80px" bg="gray.50" borderRadius="md">
        <Tile label="Centered A" />
        <Tile label="Centered B" />
      </Flex>
    </ChakraPreviewShell>
  );
}

export function ChakraFlexBetween(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Flex justify="space-between" align="center" w="100%">
        <Tile label="Start" />
        <Tile label="End" />
      </Flex>
    </ChakraPreviewShell>
  );
}
