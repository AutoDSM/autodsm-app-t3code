import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import type { JSX } from "react";
import { useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiTabsProps {
  readonly variant?: "standard" | "scrollable" | "fullWidth";
  readonly centered?: boolean;
  readonly defaultValue?: number;
}

const TABS = ["Overview", "Tokens", "Components", "Themes", "Settings"];

export function MuiTabs(props: MuiTabsProps): JSX.Element {
  const { variant = "standard", centered = false, defaultValue = 0 } = props;
  const [value, setValue] = useState(defaultValue);
  return (
    <MuiPreviewShell>
      <Box sx={{ width: 420, borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={(_event, newValue: number) => setValue(newValue)}
          variant={variant}
          centered={centered && variant !== "scrollable"}
          scrollButtons={variant === "scrollable" ? "auto" : false}
        >
          {TABS.map((label) => (
            <Tab key={label} label={label} />
          ))}
        </Tabs>
      </Box>
    </MuiPreviewShell>
  );
}

export const MuiTabsScrollable = (): JSX.Element => <MuiTabs variant="scrollable" />;
export const MuiTabsCentered = (): JSX.Element => <MuiTabs centered />;
