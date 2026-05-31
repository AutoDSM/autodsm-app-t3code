import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import type { JSX } from "react";
import { useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

type Item = string;

function not(a: ReadonlyArray<Item>, b: ReadonlyArray<Item>): ReadonlyArray<Item> {
  return a.filter((value) => !b.includes(value));
}
function intersection(a: ReadonlyArray<Item>, b: ReadonlyArray<Item>): ReadonlyArray<Item> {
  return a.filter((value) => b.includes(value));
}

const INITIAL_LEFT: ReadonlyArray<Item> = ["Button", "Card", "Dialog", "Drawer"];
const INITIAL_RIGHT: ReadonlyArray<Item> = ["Avatar", "Badge", "Chip"];

export interface MuiTransferListProps {
  readonly title?: string;
}

function CustomList(
  items: ReadonlyArray<Item>,
  checked: ReadonlyArray<Item>,
  onToggle: (value: Item) => void,
): JSX.Element {
  return (
    <Paper sx={{ width: 180, height: 200, overflow: "auto" }}>
      <List dense component="div" role="list">
        {items.map((value) => {
          const labelId = `transfer-list-item-${value}`;
          return (
            <ListItemButton key={value} role="listitem" onClick={() => onToggle(value)}>
              <ListItemIcon>
                <Checkbox
                  checked={checked.includes(value)}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{ "aria-labelledby": labelId }}
                />
              </ListItemIcon>
              <ListItemText id={labelId} primary={value} />
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}

export function MuiTransferList(_props: MuiTransferListProps): JSX.Element {
  const [checked, setChecked] = useState<ReadonlyArray<Item>>([]);
  const [left, setLeft] = useState<ReadonlyArray<Item>>(INITIAL_LEFT);
  const [right, setRight] = useState<ReadonlyArray<Item>>(INITIAL_RIGHT);

  const leftChecked = intersection(checked, left);
  const rightChecked = intersection(checked, right);

  const handleToggle = (value: Item): void => {
    setChecked((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const handleAllRight = (): void => {
    setRight([...right, ...left]);
    setLeft([]);
  };
  const handleCheckedRight = (): void => {
    setRight([...right, ...leftChecked]);
    setLeft(not(left, leftChecked));
    setChecked(not(checked, leftChecked));
  };
  const handleCheckedLeft = (): void => {
    setLeft([...left, ...rightChecked]);
    setRight(not(right, rightChecked));
    setChecked(not(checked, rightChecked));
  };
  const handleAllLeft = (): void => {
    setLeft([...left, ...right]);
    setRight([]);
  };

  return (
    <MuiPreviewShell>
      <Grid container spacing={2} alignItems="center" sx={{ width: 480 }}>
        <Grid>{CustomList(left, checked, handleToggle)}</Grid>
        <Grid>
          <Grid container direction="column" alignItems="center" spacing={1}>
            <Button
              sx={{ my: 0.5 }}
              variant="outlined"
              size="small"
              onClick={handleAllRight}
              disabled={left.length === 0}
              aria-label="move all right"
            >
              ≫
            </Button>
            <Button
              sx={{ my: 0.5 }}
              variant="outlined"
              size="small"
              onClick={handleCheckedRight}
              disabled={leftChecked.length === 0}
              aria-label="move selected right"
            >
              &gt;
            </Button>
            <Button
              sx={{ my: 0.5 }}
              variant="outlined"
              size="small"
              onClick={handleCheckedLeft}
              disabled={rightChecked.length === 0}
              aria-label="move selected left"
            >
              &lt;
            </Button>
            <Button
              sx={{ my: 0.5 }}
              variant="outlined"
              size="small"
              onClick={handleAllLeft}
              disabled={right.length === 0}
              aria-label="move all left"
            >
              ≪
            </Button>
          </Grid>
        </Grid>
        <Grid>{CustomList(right, checked, handleToggle)}</Grid>
      </Grid>
    </MuiPreviewShell>
  );
}
