import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiStackProps {
  readonly direction?: "row" | "column";
  readonly spacing?: number;
}

export function MuiStack(props: MuiStackProps): JSX.Element {
  const { direction = "column", spacing = 2 } = props;
  return (
    <MuiPreviewShell>
      <Stack direction={direction} spacing={spacing} sx={{ width: 360 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">Item one</Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">Item two</Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">Item three</Typography>
        </Paper>
      </Stack>
    </MuiPreviewShell>
  );
}

export const MuiStackHorizontal = (): JSX.Element => <MuiStack direction="row" />;
