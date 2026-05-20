import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { AutoDsmCreateComponentWorkspace } from "~/components/autodsm/AutoDsmCreateComponentWorkspace";
import { SidebarNavInsetPage } from "../components/SidebarNavInsetPage";

function DesignComponentsRouteView(): JSX.Element {
  return (
    <SidebarNavInsetPage navLabel="Create component">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <AutoDsmCreateComponentWorkspace />
      </div>
    </SidebarNavInsetPage>
  );
}

export const Route = createFileRoute("/_chat/design-components")({
  component: DesignComponentsRouteView,
});
