import Popper from "@mui/material/Popper";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import type { JSX } from "react";
import { useRef, useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiPopperProps {
  readonly defaultOpen?: boolean;
  readonly placement?:
    | "bottom-start"
    | "bottom"
    | "bottom-end"
    | "top-start"
    | "top"
    | "top-end"
    | "left"
    | "right";
}

export function MuiPopper(props: MuiPopperProps): JSX.Element {
  const { defaultOpen = true, placement = "bottom-start" } = props;
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  return (
    <MuiPreviewShell>
      <Button ref={anchorRef} variant="outlined" onClick={() => setOpen((prev) => !prev)}>
        Toggle popper
      </Button>
      <Popper open={open} anchorEl={anchorRef.current} placement={placement}>
        <Paper sx={{ p: 2, mt: 1 }}>
          <Typography variant="body2">Popper content rendered in the DOM.</Typography>
        </Paper>
      </Popper>
    </MuiPreviewShell>
  );
}
