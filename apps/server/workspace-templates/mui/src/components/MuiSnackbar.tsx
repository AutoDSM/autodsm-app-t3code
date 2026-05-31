import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import type { JSX } from "react";
import { useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiSnackbarProps {
  readonly message?: string;
  readonly defaultOpen?: boolean;
  readonly anchorOrigin?: {
    readonly vertical: "top" | "bottom";
    readonly horizontal: "left" | "center" | "right";
  };
  readonly severity?: "info" | "success" | "warning" | "error";
}

export function MuiSnackbar(props: MuiSnackbarProps): JSX.Element {
  const {
    message = "Workspace synced",
    defaultOpen = true,
    anchorOrigin = { vertical: "bottom", horizontal: "left" },
    severity = "success",
  } = props;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <MuiPreviewShell>
      <Button variant="outlined" onClick={() => setOpen(true)}>
        Show snackbar
      </Button>
      <Snackbar
        open={open}
        anchorOrigin={anchorOrigin}
        autoHideDuration={null}
        onClose={() => setOpen(false)}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </MuiPreviewShell>
  );
}

export const MuiSnackbarTopRight = (): JSX.Element => (
  <MuiSnackbar anchorOrigin={{ vertical: "top", horizontal: "right" }} />
);
