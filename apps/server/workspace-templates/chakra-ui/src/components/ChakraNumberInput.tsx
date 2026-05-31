import {
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraNumberInputProps {
  readonly defaultValue?: number;
  readonly min?: number;
  readonly max?: number;
}

export function ChakraNumberInput(props: ChakraNumberInputProps): JSX.Element {
  const { defaultValue = 3, min = 0, max = 99 } = props;
  return (
    <ChakraPreviewShell>
      <NumberInput defaultValue={defaultValue} min={min} max={max}>
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </ChakraPreviewShell>
  );
}

export function ChakraNumberInputDisabled(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <NumberInput defaultValue={5} isDisabled>
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </ChakraPreviewShell>
  );
}
