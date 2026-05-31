import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiAppBarProps {
  readonly title?: string;
  readonly position?: "fixed" | "absolute" | "sticky" | "static" | "relative";
  readonly color?: "default" | "primary" | "secondary" | "transparent" | "inherit";
}

export function MuiAppBar(props: MuiAppBarProps): JSX.Element {
  const { title = "AutoDSM", position = "static", color = "primary" } = props;
  return (
    <MuiPreviewShell>
      <Box sx={{ width: 480 }}>
        <AppBar position={position} color={color}>
          <Toolbar>
            <IconButton edge="start" color="inherit" sx={{ mr: 2 }} aria-label="menu">
              <Box
                component="span"
                sx={{ display: "inline-block", width: 18, height: 2, bgcolor: "currentColor" }}
              />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {title}
            </Typography>
            <Button color="inherit">Login</Button>
          </Toolbar>
        </AppBar>
      </Box>
    </MuiPreviewShell>
  );
}

export const MuiAppBarPrimary = (): JSX.Element => <MuiAppBar color="primary" />;
export const MuiAppBarTransparent = (): JSX.Element => <MuiAppBar color="transparent" />;
