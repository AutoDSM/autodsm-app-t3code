import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import type { JSX } from "react";
import { useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiBackdropProps {
  readonly defaultOpen?: boolean;
}

export function MuiBackdrop(props: MuiBackdropProps): JSX.Element {
  const { defaultOpen = true } = props;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <MuiPreviewShell>
      <Box
        sx={{
          position: "relative",
          width: 360,
          height: 200,
          bgcolor: "background.paper",
          borderRadius: 1,
          overflow: "hidden",
        }}
        onClick={() => setOpen(true)}
      >
        <Backdrop
          open={open}
          onClick={() => setOpen(false)}
          sx={{ position: "absolute", color: "#fff", zIndex: 1 }}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
      </Box>
    </MuiPreviewShell>
  );
}
