import { Select } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraNativeSelectProps {
  readonly placeholder?: string;
}

export function ChakraNativeSelect(props: ChakraNativeSelectProps): JSX.Element {
  const { placeholder = "Choose a workspace" } = props;
  return (
    <ChakraPreviewShell>
      <Select placeholder={placeholder}>
        <option value="design">Design system</option>
        <option value="marketing">Marketing site</option>
        <option value="docs">Docs portal</option>
      </Select>
    </ChakraPreviewShell>
  );
}

export interface ChakraNativeSelectVariantProps {
  readonly placeholder?: string;
}

export function ChakraNativeSelectFilled(props: ChakraNativeSelectVariantProps): JSX.Element {
  const { placeholder = "Choose a region" } = props;
  return (
    <ChakraPreviewShell>
      <Select variant="filled" placeholder={placeholder}>
        <option value="us">United States</option>
        <option value="eu">Europe</option>
        <option value="apac">Asia Pacific</option>
      </Select>
    </ChakraPreviewShell>
  );
}

export function ChakraNativeSelectOutline(props: ChakraNativeSelectVariantProps): JSX.Element {
  const { placeholder = "Choose a plan" } = props;
  return (
    <ChakraPreviewShell>
      <Select variant="outline" placeholder={placeholder}>
        <option value="starter">Starter</option>
        <option value="growth">Growth</option>
        <option value="enterprise">Enterprise</option>
      </Select>
    </ChakraPreviewShell>
  );
}
