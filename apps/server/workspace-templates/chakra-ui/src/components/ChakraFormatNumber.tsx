import { Text } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

function format(value: number, options: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("en-US", options).format(value);
}

export interface ChakraFormatNumberProps {
  readonly value?: number;
}

export function ChakraFormatNumber(props: ChakraFormatNumberProps): JSX.Element {
  const { value = 1234567.89 } = props;
  return (
    <ChakraPreviewShell>
      <Text fontSize="2xl" fontWeight="semibold">
        {format(value, { maximumFractionDigits: 2 })}
      </Text>
    </ChakraPreviewShell>
  );
}

export interface ChakraFormatNumberVariantProps {
  readonly value?: number;
}

export function ChakraFormatNumberCurrency(props: ChakraFormatNumberVariantProps): JSX.Element {
  const { value = 4299.5 } = props;
  return (
    <ChakraPreviewShell>
      <Text fontSize="2xl" fontWeight="semibold">
        {format(value, { style: "currency", currency: "USD" })}
      </Text>
    </ChakraPreviewShell>
  );
}

export function ChakraFormatNumberPercent(props: ChakraFormatNumberVariantProps): JSX.Element {
  const { value = 0.7245 } = props;
  return (
    <ChakraPreviewShell>
      <Text fontSize="2xl" fontWeight="semibold">
        {format(value, { style: "percent", maximumFractionDigits: 2 })}
      </Text>
    </ChakraPreviewShell>
  );
}
