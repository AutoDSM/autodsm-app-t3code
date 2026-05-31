import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiCircularProgressProps {
  readonly variant?: "determinate" | "indeterminate";
  readonly value?: number;
}

export function MuiCircularProgress(props: MuiCircularProgressProps): JSX.Element {
  const { variant = "indeterminate", value = 60 } = props;
  return (
    <MuiPreviewShell>
      <Box sx={{ display: "flex", justifyContent: "center", width: 120, p: 2 }}>
        <CircularProgress variant={variant} value={value} />
      </Box>
    </MuiPreviewShell>
  );
}

export const MuiCircularProgressDeterminate = (): JSX.Element => (
  <MuiCircularProgress variant="determinate" value={72} />
);
