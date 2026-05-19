import Button from "@mui/material/Button";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export type MuiPrimaryButtonVariant = "contained" | "outlined" | "text";

export interface MuiPrimaryButtonProps {
  readonly label?: string;
  readonly disabled?: boolean;
  readonly variant?: MuiPrimaryButtonVariant;
}

export function MuiPrimaryButton(props: MuiPrimaryButtonProps): JSX.Element {
  const { label = "Material UI", disabled = false, variant = "contained" } = props;
  return (
    <MuiPreviewShell>
      <Button variant={variant} disabled={disabled}>
        {label}
      </Button>
    </MuiPreviewShell>
  );
}
