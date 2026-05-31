import ButtonGroup from "@mui/material/ButtonGroup";
import Button from "@mui/material/Button";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiButtonGroupProps {
  readonly variant?: "contained" | "outlined" | "text";
  readonly orientation?: "horizontal" | "vertical";
}

export function MuiButtonGroup(props: MuiButtonGroupProps): JSX.Element {
  const { variant = "contained", orientation = "horizontal" } = props;
  return (
    <MuiPreviewShell>
      <ButtonGroup variant={variant} orientation={orientation} aria-label="button group">
        <Button>One</Button>
        <Button>Two</Button>
        <Button>Three</Button>
      </ButtonGroup>
    </MuiPreviewShell>
  );
}

export const MuiButtonGroupOutlined = (): JSX.Element => <MuiButtonGroup variant="outlined" />;
export const MuiButtonGroupText = (): JSX.Element => <MuiButtonGroup variant="text" />;
export const MuiButtonGroupVertical = (): JSX.Element => (
  <MuiButtonGroup variant="contained" orientation="vertical" />
);
