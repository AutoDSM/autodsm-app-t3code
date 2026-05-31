import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiSwitchProps {
  readonly label?: string;
  readonly defaultChecked?: boolean;
  readonly disabled?: boolean;
}

export function MuiSwitch(props: MuiSwitchProps): JSX.Element {
  const { label = "Enable notifications", defaultChecked = true, disabled = false } = props;
  return (
    <MuiPreviewShell>
      <FormControlLabel
        control={<Switch defaultChecked={defaultChecked} disabled={disabled} />}
        label={label}
      />
    </MuiPreviewShell>
  );
}

export const MuiSwitchChecked = (): JSX.Element => <MuiSwitch defaultChecked label="Checked" />;
export const MuiSwitchDisabled = (): JSX.Element => <MuiSwitch disabled label="Disabled" />;
