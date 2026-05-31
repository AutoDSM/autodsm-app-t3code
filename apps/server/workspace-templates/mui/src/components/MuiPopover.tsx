import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import type { JSX } from "react";
import { useRef, useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiPopoverProps {
  readonly defaultOpen?: boolean;
  readonly message?: string;
}

export function MuiPopover(props: MuiPopoverProps): JSX.Element {
  const { defaultOpen = true, message = "The content of the Popover." } = props;
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  return (
    <MuiPreviewShell>
      <Button ref={anchorRef} variant="outlined" onClick={() => setOpen(true)}>
        Open popover
      </Button>
      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Typography sx={{ p: 2 }} variant="body2">
          {message}
        </Typography>
      </Popover>
    </MuiPreviewShell>
  );
}
