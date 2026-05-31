import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiAlertProps {
  readonly severity?: "info" | "success" | "warning" | "error";
  readonly title?: string;
  readonly message?: string;
}

export function MuiAlert(props: MuiAlertProps): JSX.Element {
  const { severity = "info", title = "Heads up", message = "Save before refreshing." } = props;
  return (
    <MuiPreviewShell>
      <Alert severity={severity}>
        <AlertTitle>{title}</AlertTitle>
        {message}
      </Alert>
    </MuiPreviewShell>
  );
}

export const MuiAlertSuccess = (): JSX.Element => (
  <MuiAlert severity="success" title="Synced" message="Tokens are up to date." />
);
export const MuiAlertWarning = (): JSX.Element => (
  <MuiAlert severity="warning" title="Heads up" message="Save before refreshing." />
);
export const MuiAlertError = (): JSX.Element => (
  <MuiAlert severity="error" title="Build failed" message="Check the deploy logs." />
);
