import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import Box from "@mui/material/Box";
import type { JSX } from "react";
import { useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

const ACTIONS = [{ name: "Share" }, { name: "Print" }, { name: "Save" }];

export interface MuiSpeedDialProps {
  readonly defaultOpen?: boolean;
}

export function MuiSpeedDial(props: MuiSpeedDialProps): JSX.Element {
  const { defaultOpen = true } = props;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <MuiPreviewShell>
      <Box sx={{ position: "relative", width: 260, height: 240 }}>
        <SpeedDial
          ariaLabel="SpeedDial demo"
          sx={{ position: "absolute", bottom: 16, right: 16 }}
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          icon={
            <Box component="span" sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
              +
            </Box>
          }
        >
          {ACTIONS.map((action) => (
            <SpeedDialAction
              key={action.name}
              tooltipTitle={action.name}
              tooltipOpen
              icon={
                <Box component="span" sx={{ fontSize: 12, fontWeight: 600 }}>
                  {action.name.charAt(0)}
                </Box>
              }
            />
          ))}
        </SpeedDial>
      </Box>
    </MuiPreviewShell>
  );
}
