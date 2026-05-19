import { Badge, HStack } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraBadgeRowProps {
  readonly primaryLabel?: string;
  readonly secondaryLabel?: string;
}

export function ChakraBadgeRow(props: ChakraBadgeRowProps): JSX.Element {
  const { primaryLabel = "Alpha", secondaryLabel = "Beta" } = props;
  return (
    <ChakraPreviewShell>
      <HStack spacing={2}>
        <Badge
          cursor="pointer"
          px={2}
          py={0.5}
          borderRadius="full"
          _hover={{ opacity: 0.85 }}
          _active={{ transform: "translateY(1px)" }}
        >
          {primaryLabel}
        </Badge>
        <Badge
          colorScheme="green"
          cursor="pointer"
          px={2}
          py={0.5}
          borderRadius="full"
          _hover={{ opacity: 0.85 }}
          _active={{ transform: "translateY(1px)" }}
        >
          {secondaryLabel}
        </Badge>
      </HStack>
    </ChakraPreviewShell>
  );
}
