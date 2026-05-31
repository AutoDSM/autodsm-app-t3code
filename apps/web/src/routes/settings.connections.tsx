import { createFileRoute, redirect } from "@tanstack/react-router";

import { ConnectionsSettings } from "../components/settings/ConnectionsSettings";
import { isElectron } from "../env";

export const Route = createFileRoute("/settings/connections")({
  beforeLoad: () => {
    if (isElectron) {
      throw redirect({ to: "/settings/general", replace: true });
    }
  },
  component: ConnectionsSettings,
});
