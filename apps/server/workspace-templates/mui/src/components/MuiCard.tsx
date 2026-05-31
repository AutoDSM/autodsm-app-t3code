import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiCardProps {
  readonly variant?: "elevation" | "outlined";
  readonly elevation?: number;
  readonly title?: string;
  readonly description?: string;
}

export function MuiCard(props: MuiCardProps): JSX.Element {
  const {
    variant = "elevation",
    elevation = 1,
    title = "AutoDSM workspace",
    description = "Generate components from your design system.",
  } = props;
  return (
    <MuiPreviewShell>
      <Card variant={variant} elevation={elevation} sx={{ width: 320 }}>
        <CardMedia
          component={Box}
          sx={{ height: 120, bgcolor: "primary.light" }}
          aria-label="cover"
        />
        <CardContent>
          <Typography gutterBottom variant="h6" component="div">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </CardContent>
        <CardActions>
          <Button size="small">Share</Button>
          <Button size="small">Learn more</Button>
        </CardActions>
      </Card>
    </MuiPreviewShell>
  );
}

export const MuiCardElevated = (): JSX.Element => <MuiCard variant="elevation" elevation={6} />;
export const MuiCardOutlined = (): JSX.Element => <MuiCard variant="outlined" />;
