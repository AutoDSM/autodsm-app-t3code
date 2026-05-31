import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import type { JSX } from "react";
import { useState } from "react";

import { MuiPreviewShell } from "../preview/MuiPreviewShell";

export interface MuiModalProps {
  readonly title?: string;
  readonly description?: string;
  readonly defaultOpen?: boolean;
}

export function MuiModal(props: MuiModalProps): JSX.Element {
  const {
    title = "Text in a modal",
    description = "Modals are lower-level overlays used by Dialog and Drawer.",
    defaultOpen = true,
  } = props;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <MuiPreviewShell>
      <Button variant="outlined" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} aria-labelledby="modal-title">
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 360,
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 1,
            p: 3,
          }}
        >
          <Typography id="modal-title" variant="h6" component="h2">
            {title}
          </Typography>
          <Typography sx={{ mt: 2 }} variant="body2">
            {description}
          </Typography>
        </Box>
      </Modal>
    </MuiPreviewShell>
  );
}
