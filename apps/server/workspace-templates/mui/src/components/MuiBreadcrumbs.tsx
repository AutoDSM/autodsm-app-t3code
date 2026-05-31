import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiBreadcrumbsProps {
  readonly maxItems?: number;
  readonly separator?: string;
}

export function MuiBreadcrumbs(props: MuiBreadcrumbsProps): JSX.Element {
  const { maxItems = 8, separator = "/" } = props;
  return (
    <MuiPreviewShell>
      <Breadcrumbs maxItems={maxItems} separator={separator} aria-label="breadcrumb">
        <Link underline="hover" color="inherit" href="#">
          AutoDSM
        </Link>
        <Link underline="hover" color="inherit" href="#">
          Workspaces
        </Link>
        <Link underline="hover" color="inherit" href="#">
          Components
        </Link>
        <Typography color="text.primary">Breadcrumbs</Typography>
      </Breadcrumbs>
    </MuiPreviewShell>
  );
}

export const MuiBreadcrumbsCondensed = (): JSX.Element => <MuiBreadcrumbs maxItems={2} />;
