import { Alert, AlertDescription, AlertIcon, AlertTitle, Box, CloseButton } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraToastProps {
  readonly title?: string;
  readonly description?: string;
  readonly status?: "info" | "success" | "warning" | "error";
}

export function ChakraToast(props: ChakraToastProps): JSX.Element {
  const {
    title = "Changes saved",
    description = "Your draft has been published to the workspace.",
    status = "success",
  } = props;
  return (
    <ChakraPreviewShell>
      <Box
        maxW="sm"
        borderRadius="md"
        boxShadow="lg"
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
      >
        <Alert status={status} variant="solid" borderRadius="md" alignItems="flex-start">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription display="block">{description}</AlertDescription>
          </Box>
          <CloseButton position="relative" right={-1} top={-1} />
        </Alert>
      </Box>
    </ChakraPreviewShell>
  );
}
