import { createFileRoute } from "@tanstack/react-router";
import { useState, type JSX } from "react";

import { AutoDsmComponentsWorkspace } from "~/components/autodsm/AutoDsmComponentsWorkspace";
import { AutoDsmCreateComponentWorkspace } from "~/components/autodsm/AutoDsmCreateComponentWorkspace";
import { ToggleGroup, Toggle } from "~/components/ui/toggle-group";
import { SidebarNavInsetPage } from "../components/SidebarNavInsetPage";

type DesignComponentsMode = "create" | "browse";

function DesignComponentsRouteView(): JSX.Element {
  const [mode, setMode] = useState<DesignComponentsMode>("create");

  return (
    <SidebarNavInsetPage navLabel="Create component">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ToggleGroup
            aria-label="Components workspace mode"
            onValueChange={(value) => {
              if (value.length === 0) {
                return;
              }
              const next = value[0];
              if (next === "create" || next === "browse") {
                setMode(next);
              }
            }}
            value={[mode]}
            variant="outline"
          >
            <Toggle aria-label="Create component" value="create">
              Create
            </Toggle>
            <Toggle aria-label="Browse components" value="browse">
              Browse
            </Toggle>
          </ToggleGroup>
        </div>

        {mode === "create" ? <AutoDsmCreateComponentWorkspace /> : <AutoDsmComponentsWorkspace />}
      </div>
    </SidebarNavInsetPage>
  );
}

export const Route = createFileRoute("/_chat/design-components")({
  component: DesignComponentsRouteView,
});
