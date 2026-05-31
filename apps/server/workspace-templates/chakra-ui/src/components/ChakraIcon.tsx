import { Icon } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

const STAR_PATH =
  "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z";
const BELL_PATH =
  "M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 1 0-3 0v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z";
const CHEVRON_RIGHT_PATH = "M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z";

export interface ChakraIconProps {
  readonly color?: string;
  readonly boxSize?: number | string;
}

export function ChakraIcon(props: ChakraIconProps): JSX.Element {
  const { color = "purple.500", boxSize = 6 } = props;
  return (
    <ChakraPreviewShell>
      <Icon viewBox="0 0 24 24" color={color} boxSize={boxSize}>
        <path fill="currentColor" d={STAR_PATH} />
      </Icon>
    </ChakraPreviewShell>
  );
}

export interface ChakraIconVariantProps {
  readonly color?: string;
  readonly boxSize?: number | string;
}

export function ChakraIconStar(props: ChakraIconVariantProps): JSX.Element {
  const { color = "yellow.400", boxSize = 6 } = props;
  return (
    <ChakraPreviewShell>
      <Icon viewBox="0 0 24 24" color={color} boxSize={boxSize}>
        <path fill="currentColor" d={STAR_PATH} />
      </Icon>
    </ChakraPreviewShell>
  );
}

export function ChakraIconBell(props: ChakraIconVariantProps): JSX.Element {
  const { color = "purple.500", boxSize = 6 } = props;
  return (
    <ChakraPreviewShell>
      <Icon viewBox="0 0 24 24" color={color} boxSize={boxSize}>
        <path fill="currentColor" d={BELL_PATH} />
      </Icon>
    </ChakraPreviewShell>
  );
}

export function ChakraIconChevronRight(props: ChakraIconVariantProps): JSX.Element {
  const { color = "gray.500", boxSize = 6 } = props;
  return (
    <ChakraPreviewShell>
      <Icon viewBox="0 0 24 24" color={color} boxSize={boxSize}>
        <path fill="currentColor" d={CHEVRON_RIGHT_PATH} />
      </Icon>
    </ChakraPreviewShell>
  );
}
