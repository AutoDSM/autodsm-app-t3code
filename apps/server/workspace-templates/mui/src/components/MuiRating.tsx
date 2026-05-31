import Rating from "@mui/material/Rating";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiRatingProps {
  readonly value?: number;
  readonly readOnly?: boolean;
  readonly size?: "small" | "medium" | "large";
}

export function MuiRating(props: MuiRatingProps): JSX.Element {
  const { value = 3.5, readOnly = false, size = "medium" } = props;
  return (
    <MuiPreviewShell>
      <Box sx={{ p: 1 }}>
        <Rating value={value} readOnly={readOnly} size={size} precision={0.5} />
      </Box>
    </MuiPreviewShell>
  );
}

export const MuiRatingReadOnly = (): JSX.Element => <MuiRating value={4.5} readOnly />;
export const MuiRatingSmall = (): JSX.Element => <MuiRating size="small" value={3} />;
