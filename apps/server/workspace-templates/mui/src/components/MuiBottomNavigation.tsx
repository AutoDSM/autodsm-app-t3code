import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";
import type { JSX } from "react";
import { useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiBottomNavigationProps {
  readonly defaultValue?: number;
}

export function MuiBottomNavigation(props: MuiBottomNavigationProps): JSX.Element {
  const { defaultValue = 0 } = props;
  const [value, setValue] = useState(defaultValue);
  return (
    <MuiPreviewShell>
      <Paper sx={{ width: 360 }} elevation={3}>
        <BottomNavigation
          showLabels
          value={value}
          onChange={(_event, newValue: number) => setValue(newValue)}
        >
          <BottomNavigationAction label="Home" />
          <BottomNavigationAction label="Library" />
          <BottomNavigationAction label="Settings" />
        </BottomNavigation>
      </Paper>
    </MuiPreviewShell>
  );
}
