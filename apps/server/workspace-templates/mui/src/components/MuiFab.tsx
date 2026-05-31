import Fab from "@mui/material/Fab";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiFabProps {
  readonly variant?: "circular" | "extended";
  readonly color?: "default" | "primary" | "secondary" | "info" | "success" | "warning" | "error";
  readonly label?: string;
}

export function MuiFab(props: MuiFabProps): JSX.Element {
  const { variant = "circular", color = "primary", label = "Compose" } = props;
  return (
    <MuiPreviewShell>
      <Box sx={{ p: 1 }}>
        <Fab variant={variant} color={color} aria-label={label}>
          {variant === "extended" ? (
            <Box component="span" sx={{ px: 1 }}>
              {label}
            </Box>
          ) : (
            <Box component="span" sx={{ fontSize: 24, lineHeight: 1, fontWeight: 700 }}>
              +
            </Box>
          )}
        </Fab>
      </Box>
    </MuiPreviewShell>
  );
}

export const MuiFabExtended = (): JSX.Element => <MuiFab variant="extended" label="Compose" />;
