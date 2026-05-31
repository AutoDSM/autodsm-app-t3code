import { Box, Circle, HStack, Stack, Text } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

interface Step {
  readonly title: string;
  readonly description: string;
}

const DEFAULT_STEPS: ReadonlyArray<Step> = [
  { title: "Account", description: "Create your workspace" },
  { title: "Branding", description: "Define tokens" },
  { title: "Components", description: "Publish library" },
];

function StepCircle({ index, active }: { index: number; active: boolean }): JSX.Element {
  return (
    <Circle
      size="32px"
      bg={active ? "purple.500" : "gray.200"}
      color={active ? "white" : "gray.700"}
      fontWeight="semibold"
      fontSize="sm"
    >
      {index + 1}
    </Circle>
  );
}

export interface ChakraStepsProps {
  readonly activeStep?: number;
}

export function ChakraSteps(props: ChakraStepsProps): JSX.Element {
  const { activeStep = 1 } = props;
  return (
    <ChakraPreviewShell>
      <HStack spacing={4} align="center" w="100%">
        {DEFAULT_STEPS.map((step, i) => (
          <HStack key={step.title} spacing={3}>
            <StepCircle index={i} active={i <= activeStep} />
            <Box>
              <Text fontWeight="medium">{step.title}</Text>
              <Text fontSize="xs" color="gray.500">
                {step.description}
              </Text>
            </Box>
            {i < DEFAULT_STEPS.length - 1 && <Box w="32px" h="1px" bg="gray.200" />}
          </HStack>
        ))}
      </HStack>
    </ChakraPreviewShell>
  );
}

export function ChakraStepsHorizontal(): JSX.Element {
  return <ChakraSteps activeStep={1} />;
}

export function ChakraStepsVertical(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Stack spacing={4} align="flex-start">
        {DEFAULT_STEPS.map((step, i) => (
          <HStack key={step.title} spacing={3} align="flex-start">
            <StepCircle index={i} active={i <= 1} />
            <Box>
              <Text fontWeight="medium">{step.title}</Text>
              <Text fontSize="xs" color="gray.500">
                {step.description}
              </Text>
            </Box>
          </HStack>
        ))}
      </Stack>
    </ChakraPreviewShell>
  );
}
