import { Switch, FormControl, FormLabel } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraSwitchProps {
  readonly label?: string;
  readonly defaultChecked?: boolean;
}

export function ChakraSwitch(props: ChakraSwitchProps): JSX.Element {
  const { label = "Enable previews", defaultChecked = true } = props;
  return (
    <ChakraPreviewShell>
      <FormControl display="flex" alignItems="center">
        <FormLabel htmlFor="preview-switch" mb="0">
          {label}
        </FormLabel>
        <Switch id="preview-switch" defaultChecked={defaultChecked} />
      </FormControl>
    </ChakraPreviewShell>
  );
}

export interface ChakraSwitchVariantProps {
  readonly label?: string;
}

export function ChakraSwitchChecked(props: ChakraSwitchVariantProps): JSX.Element {
  const { label = "Notifications" } = props;
  return (
    <ChakraPreviewShell>
      <FormControl display="flex" alignItems="center">
        <FormLabel htmlFor="switch-checked" mb="0">
          {label}
        </FormLabel>
        <Switch id="switch-checked" defaultChecked />
      </FormControl>
    </ChakraPreviewShell>
  );
}

export function ChakraSwitchDisabled(props: ChakraSwitchVariantProps): JSX.Element {
  const { label = "Locked setting" } = props;
  return (
    <ChakraPreviewShell>
      <FormControl display="flex" alignItems="center">
        <FormLabel htmlFor="switch-disabled" mb="0">
          {label}
        </FormLabel>
        <Switch id="switch-disabled" isDisabled />
      </FormControl>
    </ChakraPreviewShell>
  );
}

export function ChakraSwitchSm(props: ChakraSwitchVariantProps): JSX.Element {
  const { label = "Compact" } = props;
  return (
    <ChakraPreviewShell>
      <FormControl display="flex" alignItems="center">
        <FormLabel htmlFor="switch-sm" mb="0">
          {label}
        </FormLabel>
        <Switch id="switch-sm" size="sm" />
      </FormControl>
    </ChakraPreviewShell>
  );
}

export function ChakraSwitchLg(props: ChakraSwitchVariantProps): JSX.Element {
  const { label = "Roomy" } = props;
  return (
    <ChakraPreviewShell>
      <FormControl display="flex" alignItems="center">
        <FormLabel htmlFor="switch-lg" mb="0">
          {label}
        </FormLabel>
        <Switch id="switch-lg" size="lg" />
      </FormControl>
    </ChakraPreviewShell>
  );
}
