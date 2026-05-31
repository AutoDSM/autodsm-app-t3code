import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import type { JSX } from "react";
import { useRef, useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiMenuProps {
  readonly dense?: boolean;
  readonly defaultOpen?: boolean;
}

export function MuiMenu(props: MuiMenuProps): JSX.Element {
  const { dense = false, defaultOpen = true } = props;
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  return (
    <MuiPreviewShell>
      <Button ref={anchorRef} variant="outlined" onClick={() => setOpen(true)}>
        Open menu
      </Button>
      <Menu
        anchorEl={anchorRef.current}
        open={open}
        onClose={() => setOpen(false)}
        MenuListProps={{ dense }}
      >
        <MenuItem onClick={() => setOpen(false)}>Profile</MenuItem>
        <MenuItem onClick={() => setOpen(false)}>My account</MenuItem>
        <MenuItem onClick={() => setOpen(false)}>Logout</MenuItem>
      </Menu>
    </MuiPreviewShell>
  );
}

export const MuiMenuDense = (): JSX.Element => <MuiMenu dense />;
