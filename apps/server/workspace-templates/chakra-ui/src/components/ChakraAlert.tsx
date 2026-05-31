import { Alert, AlertIcon, AlertTitle, AlertDescription } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraAlertProps {
  readonly status?: "info" | "success" | "warning" | "error";
  readonly title?: string;
  readonly description?: string;
}

export function ChakraAlert(props: ChakraAlertProps): JSX.Element {
  const { status = "info", title = "Heads up", description = "Review your settings." } = props;
  return (
    <ChakraPreviewShell>
      <Alert status={status}>
        <AlertIcon />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </ChakraPreviewShell>
  );
}

export interface ChakraAlertVariantProps {
  readonly title?: string;
  readonly description?: string;
}

export function ChakraAlertSuccess(props: ChakraAlertVariantProps): JSX.Element {
  const { title = "Saved", description = "Your changes have been applied." } = props;
  return (
    <ChakraPreviewShell>
      <Alert status="success">
        <AlertIcon />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </ChakraPreviewShell>
  );
}

export function ChakraAlertWarning(props: ChakraAlertVariantProps): JSX.Element {
  const { title = "Heads up", description = "Some fields need attention." } = props;
  return (
    <ChakraPreviewShell>
      <Alert status="warning">
        <AlertIcon />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </ChakraPreviewShell>
  );
}

export function ChakraAlertError(props: ChakraAlertVariantProps): JSX.Element {
  const { title = "Something went wrong", description = "We couldn't reach the server." } = props;
  return (
    <ChakraPreviewShell>
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </ChakraPreviewShell>
  );
}
