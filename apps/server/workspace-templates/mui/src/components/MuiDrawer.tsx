import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import type { JSX } from "react";
import { useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export type MuiDrawerAnchor = "left" | "right" | "top" | "bottom";

export interface MuiDrawerProps {
  readonly anchor?: MuiDrawerAnchor;
  readonly defaultOpen?: boolean;
}

export function MuiDrawer(props: MuiDrawerProps): JSX.Element {
  const { anchor = "left", defaultOpen = true } = props;
  const [open, setOpen] = useState(defaultOpen);
  const horizontal = anchor === "left" || anchor === "right";
  return (
    <MuiPreviewShell>
      <Box sx={{ width: 320 }}>
        <Button variant="outlined" onClick={() => setOpen(true)}>
          Open drawer ({anchor})
        </Button>
        <Drawer anchor={anchor} open={open} onClose={() => setOpen(false)}>
          <Box sx={{ width: horizontal ? 240 : "auto", p: 1 }} role="presentation">
            <List>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemText primary="Dashboard" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemText primary="Projects" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemText primary="Team" />
                </ListItemButton>
              </ListItem>
            </List>
            <Divider />
            <List>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemText primary="Settings" />
                </ListItemButton>
              </ListItem>
            </List>
          </Box>
        </Drawer>
      </Box>
    </MuiPreviewShell>
  );
}

export const MuiDrawerLeft = (): JSX.Element => <MuiDrawer anchor="left" />;
export const MuiDrawerRight = (): JSX.Element => <MuiDrawer anchor="right" />;
export const MuiDrawerTop = (): JSX.Element => <MuiDrawer anchor="top" />;
export const MuiDrawerBottom = (): JSX.Element => <MuiDrawer anchor="bottom" />;
