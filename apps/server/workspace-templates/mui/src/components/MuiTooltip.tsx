import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiTooltipProps {
  readonly label?: string;
  readonly title?: string;
}

export function MuiTooltip(props: MuiTooltipProps): JSX.Element {
  const { label = "Hover me", title = "Delete project" } = props;
  return (
    <MuiPreviewShell>
      <Tooltip title={title} open>
        <Button variant="outlined">{label}</Button>
      </Tooltip>
    </MuiPreviewShell>
  );
}
