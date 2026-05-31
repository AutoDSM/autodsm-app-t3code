import Radio from "@mui/material/Radio";
import FormControlLabel from "@mui/material/FormControlLabel";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiRadioProps {
  readonly checked?: boolean;
  readonly disabled?: boolean;
  readonly label?: string;
}

export function MuiRadio(props: MuiRadioProps): JSX.Element {
  const { checked = false, disabled = false, label = "Standard plan" } = props;
  return (
    <MuiPreviewShell>
      <FormControlLabel control={<Radio checked={checked} disabled={disabled} />} label={label} />
    </MuiPreviewShell>
  );
}

export const MuiRadioChecked = (): JSX.Element => <MuiRadio checked label="Selected option" />;
export const MuiRadioDisabled = (): JSX.Element => <MuiRadio disabled label="Disabled option" />;
