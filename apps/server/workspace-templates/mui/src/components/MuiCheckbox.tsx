import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiCheckboxProps {
  readonly label?: string;
  readonly defaultChecked?: boolean;
  readonly indeterminate?: boolean;
  readonly disabled?: boolean;
}

export function MuiCheckbox(props: MuiCheckboxProps): JSX.Element {
  const {
    label = "I agree to the terms",
    defaultChecked = true,
    indeterminate = false,
    disabled = false,
  } = props;
  return (
    <MuiPreviewShell>
      <FormControlLabel
        control={
          <Checkbox
            defaultChecked={defaultChecked}
            indeterminate={indeterminate}
            disabled={disabled}
          />
        }
        label={label}
      />
    </MuiPreviewShell>
  );
}

export const MuiCheckboxChecked = (): JSX.Element => (
  <MuiCheckbox defaultChecked label="Subscribed" />
);
export const MuiCheckboxIndeterminate = (): JSX.Element => (
  <MuiCheckbox indeterminate label="Partial selection" />
);
export const MuiCheckboxDisabled = (): JSX.Element => (
  <MuiCheckbox disabled label="Disabled option" />
);
