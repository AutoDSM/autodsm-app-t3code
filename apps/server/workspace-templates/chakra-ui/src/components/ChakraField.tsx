import { FormControl, FormErrorMessage, FormHelperText, FormLabel, Input } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraFieldProps {
  readonly label?: string;
  readonly placeholder?: string;
}

export function ChakraField(props: ChakraFieldProps): JSX.Element {
  const { label = "Email address", placeholder = "you@example.com" } = props;
  return (
    <ChakraPreviewShell>
      <FormControl>
        <FormLabel>{label}</FormLabel>
        <Input placeholder={placeholder} />
      </FormControl>
    </ChakraPreviewShell>
  );
}

export interface ChakraFieldVariantProps {
  readonly label?: string;
  readonly placeholder?: string;
}

export function ChakraFieldRequired(props: ChakraFieldVariantProps): JSX.Element {
  const { label = "Email", placeholder = "you@example.com" } = props;
  return (
    <ChakraPreviewShell>
      <FormControl isRequired>
        <FormLabel>{label}</FormLabel>
        <Input placeholder={placeholder} />
      </FormControl>
    </ChakraPreviewShell>
  );
}

export function ChakraFieldInvalid(props: ChakraFieldVariantProps): JSX.Element {
  const { label = "Email", placeholder = "you@example.com" } = props;
  return (
    <ChakraPreviewShell>
      <FormControl isInvalid>
        <FormLabel>{label}</FormLabel>
        <Input placeholder={placeholder} />
        <FormErrorMessage>Please enter a valid email address.</FormErrorMessage>
      </FormControl>
    </ChakraPreviewShell>
  );
}

export function ChakraFieldHelperText(props: ChakraFieldVariantProps): JSX.Element {
  const { label = "Username", placeholder = "yourname" } = props;
  return (
    <ChakraPreviewShell>
      <FormControl>
        <FormLabel>{label}</FormLabel>
        <Input placeholder={placeholder} />
        <FormHelperText>This will appear on your public profile.</FormHelperText>
      </FormControl>
    </ChakraPreviewShell>
  );
}
