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

export interface ChakraBadgeVariantProps {
  readonly label?: string;
  readonly colorScheme?: string;
}

export function ChakraBadgeSolid(props: ChakraBadgeVariantProps): JSX.Element {
  const { label = "Solid", colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <Badge variant="solid" colorScheme={colorScheme}>
        {label}
      </Badge>
    </ChakraPreviewShell>
  );
}

export function ChakraBadgeSubtle(props: ChakraBadgeVariantProps): JSX.Element {
  const { label = "Subtle", colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <Badge variant="subtle" colorScheme={colorScheme}>
        {label}
      </Badge>
    </ChakraPreviewShell>
  );
}

export function ChakraBadgeOutline(props: ChakraBadgeVariantProps): JSX.Element {
  const { label = "Outline", colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <Badge variant="outline" colorScheme={colorScheme}>
        {label}
      </Badge>
    </ChakraPreviewShell>
  );
}
