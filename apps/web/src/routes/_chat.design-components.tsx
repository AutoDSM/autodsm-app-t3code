import { createFileRoute } from "@tanstack/react-router";

import { SidebarNavInsetPage } from "../components/SidebarNavInsetPage";

function DesignComponentsRouteView() {
  return (
    <SidebarNavInsetPage navLabel="Create component">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create component</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Scaffold and iterate on UI building blocks—layouts, primitives, and composite components.
        </p>
      </div>
    </SidebarNavInsetPage>
  );
}

export const Route = createFileRoute("/_chat/design-components")({
  component: DesignComponentsRouteView,
});
