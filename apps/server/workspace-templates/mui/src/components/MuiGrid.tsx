import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiGridProps {
  readonly spacing?: number;
}

export function MuiGrid(props: MuiGridProps): JSX.Element {
  const { spacing = 2 } = props;
  const cells = ["Tokens", "Components", "Themes"];
  return (
    <MuiPreviewShell>
      <Box sx={{ width: 480 }}>
        <Grid container spacing={spacing}>
          {cells.map((cell) => (
            <Grid key={cell} size={{ xs: 12, sm: 4 }}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="subtitle2">{cell}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </MuiPreviewShell>
  );
}
