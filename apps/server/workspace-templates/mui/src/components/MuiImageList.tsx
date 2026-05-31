import ImageList from "@mui/material/ImageList";
import ImageListItem from "@mui/material/ImageListItem";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

const TILES = [
  { color: "#1976d2", height: 100 },
  { color: "#9c27b0", height: 140 },
  { color: "#2e7d32", height: 80 },
  { color: "#ed6c02", height: 120 },
  { color: "#d32f2f", height: 160 },
  { color: "#0288d1", height: 90 },
];

export interface MuiImageListProps {
  readonly variant?: "standard" | "masonry" | "quilted" | "woven";
  readonly cols?: number;
}

export function MuiImageList(props: MuiImageListProps): JSX.Element {
  const { variant = "standard", cols = 3 } = props;
  return (
    <MuiPreviewShell>
      <Box sx={{ width: 360 }}>
        <ImageList variant={variant} cols={cols} gap={8}>
          {TILES.map((tile, idx) => (
            <ImageListItem key={`${tile.color}-${idx}`}>
              <Box
                sx={{
                  width: "100%",
                  height: tile.height,
                  bgcolor: tile.color,
                  borderRadius: 1,
                }}
              />
            </ImageListItem>
          ))}
        </ImageList>
      </Box>
    </MuiPreviewShell>
  );
}

export const MuiImageListMasonry = (): JSX.Element => <MuiImageList variant="masonry" />;
