import { Divider, HStack, Stack, Text } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraSeparatorProps {
  readonly orientation?: "horizontal" | "vertical";
}

export function ChakraSeparator(props: ChakraSeparatorProps): JSX.Element {
  const { orientation = "horizontal" } = props;
  if (orientation === "vertical") {
    return (
      <ChakraPreviewShell>
        <HStack h="40px">
          <Text>Left</Text>
          <Divider orientation="vertical" />
          <Text>Right</Text>
        </HStack>
      </ChakraPreviewShell>
    );
  }
  return (
    <ChakraPreviewShell>
      <Stack w="100%">
        <Text>Above</Text>
        <Divider />
        <Text>Below</Text>
      </Stack>
    </ChakraPreviewShell>
  );
}

export function ChakraSeparatorVertical(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <HStack h="40px">
        <Text>Files</Text>
        <Divider orientation="vertical" />
        <Text>Folders</Text>
        <Divider orientation="vertical" />
        <Text>Settings</Text>
      </HStack>
    </ChakraPreviewShell>
  );
}
