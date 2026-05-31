import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiListProps {
  readonly dense?: boolean;
}

const ROWS = [
  { initials: "AD", primary: "Andrea Diaz", secondary: "Owner" },
  { initials: "BR", primary: "Bilal Rahman", secondary: "Editor" },
  { initials: "CY", primary: "Carmen Yu", secondary: "Viewer" },
];

export function MuiList(props: MuiListProps): JSX.Element {
  const { dense = false } = props;
  return (
    <MuiPreviewShell>
      <Box sx={{ width: 300, bgcolor: "background.paper" }}>
        <List dense={dense}>
          {ROWS.map((row) => (
            <ListItem key={row.initials} disablePadding>
              <ListItemButton>
                <ListItemAvatar>
                  <Avatar>{row.initials}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={row.primary} secondary={row.secondary} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </MuiPreviewShell>
  );
}

export const MuiListDense = (): JSX.Element => <MuiList dense />;
