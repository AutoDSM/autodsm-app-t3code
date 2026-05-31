import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Box from "@mui/material/Box";
import type { JSX } from "react";
import { useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

const STEPS = ["Install workspace", "Connect tokens", "Generate components"];

export interface MuiStepperProps {
  readonly orientation?: "horizontal" | "vertical";
  readonly activeStep?: number;
}

export function MuiStepper(props: MuiStepperProps): JSX.Element {
  const { orientation = "horizontal", activeStep: defaultStep = 1 } = props;
  const [activeStep] = useState(defaultStep);
  return (
    <MuiPreviewShell>
      <Box sx={{ width: 420 }}>
        <Stepper activeStep={activeStep} orientation={orientation}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>
    </MuiPreviewShell>
  );
}

export const MuiStepperVertical = (): JSX.Element => <MuiStepper orientation="vertical" />;
