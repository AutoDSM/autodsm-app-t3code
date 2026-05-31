import { Code } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraCodeProps {
  readonly children?: string;
}

export function ChakraCode(props: ChakraCodeProps): JSX.Element {
  const { children = "npm install @chakra-ui/react" } = props;
  return (
    <ChakraPreviewShell>
      <Code>{children}</Code>
    </ChakraPreviewShell>
  );
}

export interface ChakraCodeVariantProps {
  readonly children?: string;
}

export function ChakraCodeInline(props: ChakraCodeVariantProps): JSX.Element {
  const { children = "useState()" } = props;
  return (
    <ChakraPreviewShell>
      <Code colorScheme="purple" px={2}>
        {children}
      </Code>
    </ChakraPreviewShell>
  );
}

export function ChakraCodeBlock(props: ChakraCodeVariantProps): JSX.Element {
  const {
    children = "const theme = extendTheme({\n  colors: { brand: { 500: '#805ad5' } },\n});",
  } = props;
  return (
    <ChakraPreviewShell>
      <Code display="block" whiteSpace="pre" p={3} borderRadius="md">
        {children}
      </Code>
    </ChakraPreviewShell>
  );
}
