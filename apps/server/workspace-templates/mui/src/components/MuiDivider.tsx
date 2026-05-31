import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiDividerProps {
  readonly orientation?: "horizontal" | "vertical";
  readonly withLabel?: boolean;
  readonly label?: string;
}

export function MuiDivider(props: MuiDividerProps): JSX.Element {
  const { orientation = "horizontal", withLabel = false, label = "Section" } = props;
  if (orientation === "vertical") {
    return (
      <MuiPreviewShell>
        <Box sx={{ display: "flex", alignItems: "center", height: 60, width: 240 }}>
          <Typography variant="body2">Left</Typography>
          <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
          <Typography variant="body2">Middle</Typography>
          <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
          <Typography variant="body2">Right</Typography>
        </Box>
      </MuiPreviewShell>
    );
  }
  return (
    <MuiPreviewShell>
      <Box sx={{ width: 320 }}>
        <Typography variant="body2">Above divider</Typography>
        {withLabel ? (
          <Divider sx={{ my: 1 }}>
            <Chip label={label} size="small" />
          </Divider>
        ) : (
          <Divider sx={{ my: 1 }} />
        )}
        <Typography variant="body2">Below divider</Typography>
      </Box>
    </MuiPreviewShell>
  );
}

export const MuiDividerVertical = (): JSX.Element => <MuiDivider orientation="vertical" />;
export const MuiDividerWithLabel = (): JSX.Element => <MuiDivider withLabel label="Or" />;
