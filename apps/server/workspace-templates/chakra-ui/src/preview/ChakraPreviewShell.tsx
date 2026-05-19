import { ChakraProvider } from "@chakra-ui/react";
import type { JSX, ReactNode } from "react";

import { autodsmChakraTheme } from "../theme/chakraTheme.ts";

export function ChakraPreviewShell(props: { readonly children: ReactNode }): JSX.Element {
  return (
    <div className="preview-chakra-host">
      <ChakraProvider theme={autodsmChakraTheme}>{props.children}</ChakraProvider>
    </div>
  );
}
