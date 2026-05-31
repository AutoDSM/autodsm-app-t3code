import { Collapse, Box } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraCollapseProps {
  readonly body?: string;
}

export function ChakraCollapse(props: ChakraCollapseProps): JSX.Element {
  const {
    body = "Collapse hides or reveals content with an animation. This panel is currently open.",
  } = props;
  return (
    <ChakraPreviewShell>
      <Collapse in animateOpacity>
        <Box p={4} color="white" mt={1} bg="purple.500" rounded="md" shadow="md">
          {body}
        </Box>
      </Collapse>
    </ChakraPreviewShell>
  );
}
