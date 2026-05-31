import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiAccordionProps {
  readonly items?: ReadonlyArray<{ readonly title: string; readonly body: string }>;
}

export function MuiAccordion(props: MuiAccordionProps): JSX.Element {
  const {
    items = [
      { title: "Overview", body: "AutoDSM packages your design system as code." },
      { title: "Installation", body: "Run npm install to fetch dependencies." },
      { title: "Usage", body: "Import components from the workspace." },
    ],
  } = props;
  return (
    <MuiPreviewShell>
      <Box sx={{ width: 360 }}>
        {items.map((item) => (
          <Accordion key={item.title} defaultExpanded>
            <AccordionSummary>
              <Typography>{item.title}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">{item.body}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </MuiPreviewShell>
  );
}
