import { Link } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraLinkProps {
  readonly href?: string;
  readonly children?: string;
}

export function ChakraLink(props: ChakraLinkProps): JSX.Element {
  const { href = "#", children = "Read the docs" } = props;
  return (
    <ChakraPreviewShell>
      <Link href={href} color="purple.500">
        {children}
      </Link>
    </ChakraPreviewShell>
  );
}

export interface ChakraLinkVariantProps {
  readonly href?: string;
  readonly children?: string;
}

export function ChakraLinkExternal(props: ChakraLinkVariantProps): JSX.Element {
  const { href = "https://chakra-ui.com", children = "Open chakra-ui.com" } = props;
  return (
    <ChakraPreviewShell>
      <Link href={href} color="purple.500" isExternal>
        {children} ↗
      </Link>
    </ChakraPreviewShell>
  );
}
