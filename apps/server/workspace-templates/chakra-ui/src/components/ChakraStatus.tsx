import { Box, HStack, Text } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

function StatusDot({ color, label }: { color: string; label: string }): JSX.Element {
  return (
    <HStack spacing={2}>
      <Box w="8px" h="8px" borderRadius="full" bg={color} />
      <Text fontSize="sm">{label}</Text>
    </HStack>
  );
}

export interface ChakraStatusProps {
  readonly label?: string;
  readonly tone?: "online" | "offline" | "busy";
}

const TONE_COLOR: Record<string, string> = {
  online: "green.400",
  offline: "gray.400",
  busy: "red.400",
};

export function ChakraStatus(props: ChakraStatusProps): JSX.Element {
  const { label = "Online", tone = "online" } = props;
  return (
    <ChakraPreviewShell>
      <StatusDot color={TONE_COLOR[tone] ?? "gray.400"} label={label} />
    </ChakraPreviewShell>
  );
}

export function ChakraStatusOnline(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <StatusDot color="green.400" label="Online" />
    </ChakraPreviewShell>
  );
}

export function ChakraStatusOffline(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <StatusDot color="gray.400" label="Offline" />
    </ChakraPreviewShell>
  );
}

export function ChakraStatusBusy(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <StatusDot color="red.400" label="Busy" />
    </ChakraPreviewShell>
  );
}
