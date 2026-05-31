import { HStack, Icon } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

const STAR_PATH =
  "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z";

function Star({ filled }: { filled: boolean }): JSX.Element {
  return (
    <Icon viewBox="0 0 24 24" color={filled ? "yellow.400" : "gray.300"} boxSize={5}>
      <path fill="currentColor" d={STAR_PATH} />
    </Icon>
  );
}

function StarRow({ count, value }: { count: number; value: number }): JSX.Element {
  const stars = Array.from({ length: count }, (_, i) => <Star key={i} filled={i < value} />);
  return <HStack spacing={1}>{stars}</HStack>;
}

export interface ChakraRatingGroupProps {
  readonly value?: number;
  readonly count?: number;
}

export function ChakraRatingGroup(props: ChakraRatingGroupProps): JSX.Element {
  const { value = 4, count = 5 } = props;
  return (
    <ChakraPreviewShell>
      <StarRow count={count} value={value} />
    </ChakraPreviewShell>
  );
}

export interface ChakraRatingGroupVariantProps {
  readonly value?: number;
}

export function ChakraRatingGroup3Stars(props: ChakraRatingGroupVariantProps): JSX.Element {
  const { value = 2 } = props;
  return (
    <ChakraPreviewShell>
      <StarRow count={3} value={value} />
    </ChakraPreviewShell>
  );
}

export function ChakraRatingGroup10Stars(props: ChakraRatingGroupVariantProps): JSX.Element {
  const { value = 7 } = props;
  return (
    <ChakraPreviewShell>
      <StarRow count={10} value={value} />
    </ChakraPreviewShell>
  );
}
