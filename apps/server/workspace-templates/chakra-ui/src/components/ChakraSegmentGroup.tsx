import { Button, ButtonGroup } from "@chakra-ui/react";
import { useState } from "react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraSegmentGroupProps {
  readonly defaultValue?: string;
  readonly size?: "sm" | "md" | "lg";
}

const SEGMENTS = ["Day", "Week", "Month", "Year"];

function Segments({
  defaultValue,
  size,
}: {
  defaultValue: string;
  size: "sm" | "md" | "lg";
}): JSX.Element {
  const [selected, setSelected] = useState(defaultValue);
  return (
    <ButtonGroup isAttached variant="outline" size={size}>
      {SEGMENTS.map((label) => (
        <Button
          key={label}
          onClick={() => setSelected(label)}
          colorScheme={selected === label ? "purple" : undefined}
          variant={selected === label ? "solid" : "outline"}
        >
          {label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

export function ChakraSegmentGroup(props: ChakraSegmentGroupProps): JSX.Element {
  const { defaultValue = "Week", size = "md" } = props;
  return (
    <ChakraPreviewShell>
      <Segments defaultValue={defaultValue} size={size} />
    </ChakraPreviewShell>
  );
}

export function ChakraSegmentGroupSm(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Segments defaultValue="Month" size="sm" />
    </ChakraPreviewShell>
  );
}
