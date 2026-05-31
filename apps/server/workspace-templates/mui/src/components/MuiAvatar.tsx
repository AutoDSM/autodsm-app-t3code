import Avatar from "@mui/material/Avatar";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export type MuiAvatarShape = "circular" | "rounded" | "square";

export interface MuiAvatarProps {
  readonly initials?: string;
  readonly bgcolor?: string;
  readonly variant?: MuiAvatarShape;
}

export function MuiAvatar(props: MuiAvatarProps): JSX.Element {
  const { initials = "MU", bgcolor = "#1976d2", variant = "circular" } = props;
  return (
    <MuiPreviewShell>
      <Avatar variant={variant} sx={{ bgcolor }}>
        {initials.slice(0, 2).toUpperCase()}
      </Avatar>
    </MuiPreviewShell>
  );
}

export const MuiAvatarCircular = (): JSX.Element => <MuiAvatar variant="circular" />;
export const MuiAvatarRounded = (): JSX.Element => <MuiAvatar variant="rounded" />;
export const MuiAvatarSquare = (): JSX.Element => <MuiAvatar variant="square" />;
