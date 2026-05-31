import { Grid, GridItem } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraGridProps {
  readonly columns?: number;
}

export function ChakraGrid(props: ChakraGridProps): JSX.Element {
  const { columns = 3 } = props;
  return (
    <ChakraPreviewShell>
      <Grid templateColumns={`repeat(${columns}, 1fr)`} gap={3} w="100%">
        <GridItem bg="purple.100" p={3} borderRadius="md">
          1
        </GridItem>
        <GridItem bg="purple.100" p={3} borderRadius="md">
          2
        </GridItem>
        <GridItem bg="purple.100" p={3} borderRadius="md">
          3
        </GridItem>
        <GridItem bg="purple.100" p={3} borderRadius="md">
          4
        </GridItem>
        <GridItem bg="purple.100" p={3} borderRadius="md">
          5
        </GridItem>
        <GridItem bg="purple.100" p={3} borderRadius="md">
          6
        </GridItem>
      </Grid>
    </ChakraPreviewShell>
  );
}

export function ChakraGridResponsive(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Grid
        templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }}
        gap={3}
        w="100%"
      >
        <GridItem bg="purple.100" p={3} borderRadius="md">
          A
        </GridItem>
        <GridItem bg="purple.100" p={3} borderRadius="md">
          B
        </GridItem>
        <GridItem bg="purple.100" p={3} borderRadius="md">
          C
        </GridItem>
        <GridItem bg="purple.100" p={3} borderRadius="md">
          D
        </GridItem>
      </Grid>
    </ChakraPreviewShell>
  );
}
