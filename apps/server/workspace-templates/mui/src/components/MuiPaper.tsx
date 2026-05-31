import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiPaperProps {
  readonly variant?: "elevation" | "outlined";
  readonly elevation?: number;
  readonly label?: string;
}

export function MuiPaper(props: MuiPaperProps): JSX.Element {
  const { variant = "elevation", elevation = 1, label = "Paper surface" } = props;
  return (
    <MuiPreviewShell>
      <Paper variant={variant} elevation={elevation} sx={{ p: 3, width: 280 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Paper composes elevation and outline styles.
        </Typography>
      </Paper>
    </MuiPreviewShell>
  );
}

export const MuiPaperOutlined = (): JSX.Element => <MuiPaper variant="outlined" />;
export const MuiPaperElevation8 = (): JSX.Element => (
  <MuiPaper variant="elevation" elevation={8} label="Elevation 8" />
);
