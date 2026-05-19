import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiChipRowProps {
  readonly primaryLabel?: string;
  readonly secondaryLabel?: string;
}

export function MuiChipRow(props: MuiChipRowProps): JSX.Element {
  const { primaryLabel = "React", secondaryLabel = "MUI" } = props;
  return (
    <MuiPreviewShell>
      <Stack direction="row" spacing={1}>
        <Chip label={primaryLabel} size="small" clickable />
        <Chip label={secondaryLabel} size="small" color="primary" clickable />
      </Stack>
    </MuiPreviewShell>
  );
}
