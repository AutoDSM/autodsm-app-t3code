import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

interface Row {
  readonly name: string;
  readonly tokens: number;
  readonly components: number;
  readonly status: string;
}

const ROWS: ReadonlyArray<Row> = [
  { name: "Atlas", tokens: 124, components: 32, status: "Synced" },
  { name: "Orbit", tokens: 86, components: 28, status: "Pending" },
  { name: "Helix", tokens: 152, components: 44, status: "Synced" },
];

export interface MuiTableProps {
  readonly striped?: boolean;
}

export function MuiTable(props: MuiTableProps): JSX.Element {
  const { striped = false } = props;
  return (
    <MuiPreviewShell>
      <TableContainer component={Paper} sx={{ width: 480 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Workspace</TableCell>
              <TableCell align="right">Tokens</TableCell>
              <TableCell align="right">Components</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ROWS.map((row, idx) => (
              <TableRow
                key={row.name}
                sx={striped && idx % 2 === 1 ? { bgcolor: "action.hover" } : undefined}
              >
                <TableCell>{row.name}</TableCell>
                <TableCell align="right">{row.tokens}</TableCell>
                <TableCell align="right">{row.components}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </MuiPreviewShell>
  );
}

export const MuiTableStriped = (): JSX.Element => <MuiTable striped />;
