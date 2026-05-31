import LinearProgress from "@mui/material/LinearProgress";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiLinearProgressProps {
  readonly value?: number;
  readonly variant?: "determinate" | "indeterminate";
}

export function MuiLinearProgress(props: MuiLinearProgressProps): JSX.Element {
  const { value = 65, variant = "determinate" } = props;
  return (
    <MuiPreviewShell>
      <Box sx={{ width: 240 }}>
        <LinearProgress variant={variant} value={value} />
      </Box>
    </MuiPreviewShell>
  );
}

export const MuiLinearProgressDeterminate = (): JSX.Element => (
  <MuiLinearProgress variant="determinate" value={72} />
);

export const MuiLinearProgressBuffer = (): JSX.Element => (
  <MuiPreviewShell>
    <Box sx={{ width: 240 }}>
      <LinearProgress variant="buffer" value={45} valueBuffer={68} />
    </Box>
  </MuiPreviewShell>
);
