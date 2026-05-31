import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { JSX } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiContainerProps {
  readonly maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
}

export function MuiContainer(props: MuiContainerProps): JSX.Element {
  const { maxWidth = "md" } = props;
  return (
    <MuiPreviewShell>
      <Container maxWidth={maxWidth}>
        <Box sx={{ p: 3, bgcolor: "action.hover", borderRadius: 1 }}>
          <Typography variant="h6">Container ({String(maxWidth)})</Typography>
          <Typography variant="body2" color="text.secondary">
            Constrains content width responsively.
          </Typography>
        </Box>
      </Container>
    </MuiPreviewShell>
  );
}

export const MuiContainerSm = (): JSX.Element => <MuiContainer maxWidth="sm" />;
export const MuiContainerLg = (): JSX.Element => <MuiContainer maxWidth="lg" />;
