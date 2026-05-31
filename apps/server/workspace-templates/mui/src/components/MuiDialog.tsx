import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import type { JSX } from "react";
import { useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiDialogProps {
  readonly title?: string;
  readonly description?: string;
  readonly fullScreen?: boolean;
  readonly defaultOpen?: boolean;
}

export function MuiDialog(props: MuiDialogProps): JSX.Element {
  const {
    title = "Delete project?",
    description = "This action cannot be undone.",
    fullScreen = false,
    defaultOpen = true,
  } = props;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <MuiPreviewShell>
      <Button variant="outlined" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullScreen={fullScreen}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{description}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setOpen(false)} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </MuiPreviewShell>
  );
}

export const MuiDialogFullScreen = (): JSX.Element => <MuiDialog fullScreen />;
