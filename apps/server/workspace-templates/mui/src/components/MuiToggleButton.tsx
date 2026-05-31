import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import type { JSX } from "react";
import { useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiToggleButtonProps {
  readonly defaultValue?: string;
}

export function MuiToggleButton(props: MuiToggleButtonProps): JSX.Element {
  const { defaultValue = "left" } = props;
  const [value, setValue] = useState<string | null>(defaultValue);
  return (
    <MuiPreviewShell>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_event, next: string | null) => setValue(next)}
        aria-label="text alignment"
      >
        <ToggleButton value="left" aria-label="left aligned">
          Left
        </ToggleButton>
        <ToggleButton value="center" aria-label="centered">
          Center
        </ToggleButton>
        <ToggleButton value="right" aria-label="right aligned">
          Right
        </ToggleButton>
      </ToggleButtonGroup>
    </MuiPreviewShell>
  );
}

export const MuiToggleButtonGroup = (): JSX.Element => <MuiToggleButton />;
