import Skeleton from "@mui/material/Skeleton";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiSkeletonProps {
  readonly variant?: "text" | "rectangular" | "rounded" | "circular";
  readonly width?: number | string;
  readonly height?: number | string;
}

export function MuiSkeleton(props: MuiSkeletonProps): JSX.Element {
  const { variant = "text", width = 240, height = 32 } = props;
  return (
    <MuiPreviewShell>
      <Box sx={{ p: 1 }}>
        <Skeleton variant={variant} width={width} height={height} animation="wave" />
      </Box>
    </MuiPreviewShell>
  );
}

export const MuiSkeletonCircular = (): JSX.Element => (
  <MuiSkeleton variant="circular" width={48} height={48} />
);
export const MuiSkeletonRectangular = (): JSX.Element => (
  <MuiSkeleton variant="rectangular" width={240} height={120} />
);
export const MuiSkeletonText = (): JSX.Element => (
  <MuiSkeleton variant="text" width={240} height={28} />
);
