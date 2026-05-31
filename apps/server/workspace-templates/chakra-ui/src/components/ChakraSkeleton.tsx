import { Skeleton, SkeletonCircle, SkeletonText, Stack } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export function ChakraSkeleton(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Stack w="100%">
        <Skeleton height="20px" />
        <Skeleton height="20px" />
        <Skeleton height="20px" />
      </Stack>
    </ChakraPreviewShell>
  );
}

export function ChakraSkeletonCircle(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <SkeletonCircle size="12" />
    </ChakraPreviewShell>
  );
}

export function ChakraSkeletonText(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <SkeletonText noOfLines={4} spacing="3" skeletonHeight="3" w="100%" />
    </ChakraPreviewShell>
  );
}
