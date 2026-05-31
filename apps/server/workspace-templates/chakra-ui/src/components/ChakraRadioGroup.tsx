import { Radio, RadioGroup, Stack, HStack } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraRadioGroupProps {
  readonly defaultValue?: string;
}

export function ChakraRadioGroup(props: ChakraRadioGroupProps): JSX.Element {
  const { defaultValue = "weekly" } = props;
  return (
    <ChakraPreviewShell>
      <RadioGroup defaultValue={defaultValue}>
        <Stack>
          <Radio value="daily">Daily</Radio>
          <Radio value="weekly">Weekly</Radio>
          <Radio value="monthly">Monthly</Radio>
        </Stack>
      </RadioGroup>
    </ChakraPreviewShell>
  );
}

export function ChakraRadioGroupHorizontal(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <RadioGroup defaultValue="md">
        <HStack spacing={4}>
          <Radio value="sm">Small</Radio>
          <Radio value="md">Medium</Radio>
          <Radio value="lg">Large</Radio>
        </HStack>
      </RadioGroup>
    </ChakraPreviewShell>
  );
}

export function ChakraRadioGroupVertical(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <RadioGroup defaultValue="standard">
        <Stack spacing={2}>
          <Radio value="standard">Standard shipping</Radio>
          <Radio value="express">Express shipping</Radio>
          <Radio value="overnight">Overnight delivery</Radio>
        </Stack>
      </RadioGroup>
    </ChakraPreviewShell>
  );
}
