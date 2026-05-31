import TextField from "@mui/material/TextField";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiTextFieldProps {
  readonly label?: string;
  readonly placeholder?: string;
  readonly variant?: "outlined" | "filled" | "standard";
}

export function MuiTextField(props: MuiTextFieldProps): JSX.Element {
  const { label = "Email", placeholder = "you@example.com", variant = "outlined" } = props;
  return (
    <MuiPreviewShell>
      <TextField label={label} placeholder={placeholder} variant={variant} />
    </MuiPreviewShell>
  );
}

export const MuiTextFieldOutlined = (): JSX.Element => <MuiTextField variant="outlined" />;
export const MuiTextFieldFilled = (): JSX.Element => <MuiTextField variant="filled" />;
export const MuiTextFieldStandard = (): JSX.Element => <MuiTextField variant="standard" />;
