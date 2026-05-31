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

export const MuiButtonContained = (): JSX.Element => (
  <MuiPrimaryButton variant="contained" label="Contained" />
);
export const MuiButtonOutlined = (): JSX.Element => (
  <MuiPrimaryButton variant="outlined" label="Outlined" />
);
export const MuiButtonText = (): JSX.Element => <MuiPrimaryButton variant="text" label="Text" />;
