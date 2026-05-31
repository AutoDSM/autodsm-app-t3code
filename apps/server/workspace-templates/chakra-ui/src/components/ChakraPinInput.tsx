import { HStack, PinInput, PinInputField } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraPinInputProps {
  readonly defaultValue?: string;
}

export function ChakraPinInput(props: ChakraPinInputProps): JSX.Element {
  const { defaultValue = "1234" } = props;
  return (
    <ChakraPreviewShell>
      <HStack>
        <PinInput defaultValue={defaultValue}>
          <PinInputField />
          <PinInputField />
          <PinInputField />
          <PinInputField />
        </PinInput>
      </HStack>
    </ChakraPreviewShell>
  );
}

export function ChakraPinInput4Digit(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <HStack>
        <PinInput otp>
          <PinInputField />
          <PinInputField />
          <PinInputField />
          <PinInputField />
        </PinInput>
      </HStack>
    </ChakraPreviewShell>
  );
}

export function ChakraPinInput6Digit(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <HStack>
        <PinInput otp>
          <PinInputField />
          <PinInputField />
          <PinInputField />
          <PinInputField />
          <PinInputField />
          <PinInputField />
        </PinInput>
      </HStack>
    </ChakraPreviewShell>
  );
}
