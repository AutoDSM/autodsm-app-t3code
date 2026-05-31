import { Progress } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraProgressProps {
  readonly value?: number;
  readonly colorScheme?: string;
}

export function ChakraProgress(props: ChakraProgressProps): JSX.Element {
  const { value = 64, colorScheme = "purple" } = props;
  return (
    <ChakraPreviewShell>
      <Progress value={value} colorScheme={colorScheme} w="100%" borderRadius="full" />
    </ChakraPreviewShell>
  );
}

export function ChakraProgressIndeterminate(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Progress isIndeterminate colorScheme="purple" w="100%" borderRadius="full" />
    </ChakraPreviewShell>
  );
}
