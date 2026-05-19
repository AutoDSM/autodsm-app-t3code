import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { JSX, ReactNode } from "react";

import { autodsmMuiTheme } from "../theme/muiTheme.ts";

export function MuiPreviewShell(props: { readonly children: ReactNode }): JSX.Element {
  return (
    <div className="preview-mui-host">
      <ThemeProvider theme={autodsmMuiTheme}>
        <CssBaseline />
        {props.children}
      </ThemeProvider>
    </div>
  );
}
