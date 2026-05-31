import ClickAwayListener from "@mui/material/ClickAwayListener";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { JSX } from "react";
import { useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiClickAwayListenerProps {
  readonly defaultOpen?: boolean;
}

export function MuiClickAwayListener(props: MuiClickAwayListenerProps): JSX.Element {
  const { defaultOpen = true } = props;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <MuiPreviewShell>
      <ClickAwayListener onClickAway={() => setOpen(false)}>
        <Box
          onClick={() => setOpen(true)}
          sx={{
            p: 2,
            width: 280,
            borderRadius: 1,
            bgcolor: open ? "primary.main" : "action.hover",
            color: open ? "primary.contrastText" : "text.primary",
            cursor: "pointer",
          }}
        >
          <Typography variant="subtitle2">
            {open ? "Listening — click outside to close" : "Closed — click to open"}
          </Typography>
        </Box>
      </ClickAwayListener>
    </MuiPreviewShell>
  );
}
