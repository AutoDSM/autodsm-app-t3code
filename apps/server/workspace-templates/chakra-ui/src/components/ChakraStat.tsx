import { Stat, StatArrow, StatHelpText, StatLabel, StatNumber } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraStatProps {
  readonly label?: string;
  readonly value?: string;
}

export function ChakraStat(props: ChakraStatProps): JSX.Element {
  const { label = "Active users", value = "12,480" } = props;
  return (
    <ChakraPreviewShell>
      <Stat>
        <StatLabel>{label}</StatLabel>
        <StatNumber>{value}</StatNumber>
        <StatHelpText>Updated just now</StatHelpText>
      </Stat>
    </ChakraPreviewShell>
  );
}

export function ChakraStatPositive(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Stat>
        <StatLabel>Revenue</StatLabel>
        <StatNumber>$48,210</StatNumber>
        <StatHelpText>
          <StatArrow type="increase" />
          12.4%
        </StatHelpText>
      </Stat>
    </ChakraPreviewShell>
  );
}

export function ChakraStatNegative(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Stat>
        <StatLabel>Churn</StatLabel>
        <StatNumber>3.1%</StatNumber>
        <StatHelpText>
          <StatArrow type="decrease" />
          0.6%
        </StatHelpText>
      </Stat>
    </ChakraPreviewShell>
  );
}
