import { Checkbox } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraCheckboxProps {
  readonly label?: string;
}

export function ChakraCheckbox(props: ChakraCheckboxProps): JSX.Element {
  const { label = "Subscribe to updates" } = props;
  return (
    <ChakraPreviewShell>
      <Checkbox>{label}</Checkbox>
    </ChakraPreviewShell>
  );
}

export interface ChakraCheckboxVariantProps {
  readonly label?: string;
}

export function ChakraCheckboxChecked(props: ChakraCheckboxVariantProps): JSX.Element {
  const { label = "Email me weekly" } = props;
  return (
    <ChakraPreviewShell>
      <Checkbox defaultChecked>{label}</Checkbox>
    </ChakraPreviewShell>
  );
}

export function ChakraCheckboxDisabled(props: ChakraCheckboxVariantProps): JSX.Element {
  const { label = "Disabled option" } = props;
  return (
    <ChakraPreviewShell>
      <Checkbox isDisabled>{label}</Checkbox>
    </ChakraPreviewShell>
  );
}
