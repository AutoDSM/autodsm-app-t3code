import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import type { JSX } from "react";
import { useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiSelectProps {
  readonly variant?: "outlined" | "filled" | "standard";
  readonly label?: string;
  readonly defaultValue?: string;
}

export function MuiSelect(props: MuiSelectProps): JSX.Element {
  const { variant = "outlined", label = "Environment", defaultValue = "production" } = props;
  const [value, setValue] = useState(defaultValue);
  return (
    <MuiPreviewShell>
      <FormControl variant={variant} sx={{ minWidth: 200 }} size="small">
        <InputLabel id="mui-select-label">{label}</InputLabel>
        <Select
          labelId="mui-select-label"
          value={value}
          label={label}
          onChange={(event) => setValue(event.target.value)}
        >
          <MenuItem value="production">Production</MenuItem>
          <MenuItem value="staging">Staging</MenuItem>
          <MenuItem value="development">Development</MenuItem>
        </Select>
      </FormControl>
    </MuiPreviewShell>
  );
}

export const MuiSelectFilled = (): JSX.Element => <MuiSelect variant="filled" />;
export const MuiSelectStandard = (): JSX.Element => <MuiSelect variant="standard" />;
