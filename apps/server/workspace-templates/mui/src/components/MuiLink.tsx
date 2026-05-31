import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiLinkProps {
  readonly underline?: "none" | "hover" | "always";
  readonly label?: string;
  readonly href?: string;
}

export function MuiLink(props: MuiLinkProps): JSX.Element {
  const { underline = "always", label = "Visit AutoDSM docs", href = "#" } = props;
  return (
    <MuiPreviewShell>
      <Stack spacing={1}>
        <Link href={href} underline={underline}>
          {label}
        </Link>
      </Stack>
    </MuiPreviewShell>
  );
}

export const MuiLinkHover = (): JSX.Element => (
  <MuiLink underline="hover" label="Hover to underline" />
);
