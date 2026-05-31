import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiBoxProps {
  readonly label?: string;
}

export function MuiBox(props: MuiBoxProps): JSX.Element {
  const { label = "Styled Box" } = props;
  return (
    <MuiPreviewShell>
      <Box
        sx={{
          p: 3,
          width: 280,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          borderRadius: 2,
          boxShadow: 2,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Box is the lowest-level layout primitive.
        </Typography>
      </Box>
    </MuiPreviewShell>
  );
}
