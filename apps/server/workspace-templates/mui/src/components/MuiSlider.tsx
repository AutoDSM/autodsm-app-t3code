import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiSliderProps {
  readonly defaultValue?: number;
  readonly min?: number;
  readonly max?: number;
}

export function MuiSlider(props: MuiSliderProps): JSX.Element {
  const { defaultValue = 40, min = 0, max = 100 } = props;
  return (
    <MuiPreviewShell>
      <Box sx={{ width: 240 }}>
        <Slider defaultValue={defaultValue} min={min} max={max} aria-label="Volume" />
      </Box>
    </MuiPreviewShell>
  );
}

const SLIDER_MARKS = [
  { value: 0, label: "0" },
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 75, label: "75" },
  { value: 100, label: "100" },
];

export const MuiSliderMarks = (): JSX.Element => (
  <MuiPreviewShell>
    <Box sx={{ width: 280 }}>
      <Slider
        defaultValue={50}
        min={0}
        max={100}
        marks={SLIDER_MARKS}
        step={null}
        aria-label="With marks"
      />
    </Box>
  </MuiPreviewShell>
);

export const MuiSliderRange = (): JSX.Element => (
  <MuiPreviewShell>
    <Box sx={{ width: 280 }}>
      <Slider
        defaultValue={[20, 70]}
        min={0}
        max={100}
        valueLabelDisplay="auto"
        aria-label="Range"
      />
    </Box>
  </MuiPreviewShell>
);
