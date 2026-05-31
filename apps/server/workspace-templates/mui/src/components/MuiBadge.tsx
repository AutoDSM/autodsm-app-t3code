import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiBadgeProps {
  readonly variant?: "standard" | "dot";
  readonly badgeContent?: number;
  readonly color?: "primary" | "secondary" | "error" | "info" | "success" | "warning";
}

export function MuiBadge(props: MuiBadgeProps): JSX.Element {
  const { variant = "standard", badgeContent = 4, color = "primary" } = props;
  return (
    <MuiPreviewShell>
      <Badge badgeContent={badgeContent} color={color} variant={variant}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: "action.selected",
          }}
        />
      </Badge>
    </MuiPreviewShell>
  );
}

export const MuiBadgeDot = (): JSX.Element => <MuiBadge variant="dot" color="error" />;
export const MuiBadgeStandard = (): JSX.Element => (
  <MuiBadge variant="standard" badgeContent={12} />
);
