import { Container, Text } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraContainerProps {
  readonly children?: string;
  readonly maxW?: string;
}

export function ChakraContainer(props: ChakraContainerProps): JSX.Element {
  const { children = "A constrained content area with horizontal padding.", maxW = "md" } = props;
  return (
    <ChakraPreviewShell>
      <Container maxW={maxW} bg="gray.50" py={4} borderRadius="md">
        <Text>{children}</Text>
      </Container>
    </ChakraPreviewShell>
  );
}

export interface ChakraContainerVariantProps {
  readonly children?: string;
}

export function ChakraContainerSm(props: ChakraContainerVariantProps): JSX.Element {
  const { children = "Small (sm) container width." } = props;
  return (
    <ChakraPreviewShell>
      <Container maxW="sm" bg="gray.50" py={4} borderRadius="md">
        <Text>{children}</Text>
      </Container>
    </ChakraPreviewShell>
  );
}

export function ChakraContainerLg(props: ChakraContainerVariantProps): JSX.Element {
  const { children = "Large (lg) container width." } = props;
  return (
    <ChakraPreviewShell>
      <Container maxW="lg" bg="gray.50" py={4} borderRadius="md">
        <Text>{children}</Text>
      </Container>
    </ChakraPreviewShell>
  );
}
