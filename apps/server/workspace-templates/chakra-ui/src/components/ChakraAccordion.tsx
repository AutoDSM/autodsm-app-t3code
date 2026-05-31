import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
} from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraAccordionProps {
  readonly allowMultiple?: boolean;
}

export function ChakraAccordion(props: ChakraAccordionProps): JSX.Element {
  const { allowMultiple = true } = props;
  return (
    <ChakraPreviewShell>
      <Accordion allowMultiple={allowMultiple} defaultIndex={[0, 1, 2]} width="100%">
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as="span" flex="1" textAlign="left">
                Section 1: Getting started
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            Install the package and wrap your app in the provider to begin.
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as="span" flex="1" textAlign="left">
                Section 2: Theming
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            Customize tokens, colors, and component recipes in a single theme object.
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as="span" flex="1" textAlign="left">
                Section 3: Composition
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            Compose primitives to build accessible, responsive interfaces quickly.
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </ChakraPreviewShell>
  );
}
