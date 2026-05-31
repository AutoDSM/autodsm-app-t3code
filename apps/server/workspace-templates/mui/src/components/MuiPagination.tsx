import Pagination from "@mui/material/Pagination";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiPaginationProps {
  readonly count?: number;
  readonly variant?: "text" | "outlined";
  readonly shape?: "circular" | "rounded";
  readonly size?: "small" | "medium" | "large";
}

export function MuiPagination(props: MuiPaginationProps): JSX.Element {
  const { count = 10, variant = "text", shape = "circular", size = "medium" } = props;
  return (
    <MuiPreviewShell>
      <Box sx={{ p: 1 }}>
        <Pagination count={count} variant={variant} shape={shape} size={size} color="primary" />
      </Box>
    </MuiPreviewShell>
  );
}

export const MuiPaginationOutlined = (): JSX.Element => <MuiPagination variant="outlined" />;
export const MuiPaginationCompact = (): JSX.Element => <MuiPagination size="small" count={6} />;
