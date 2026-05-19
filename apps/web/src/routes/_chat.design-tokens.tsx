import { createFileRoute } from "@tanstack/react-router";

import { AutoDsmDesignTokensWorkspace } from "~/components/autodsm/AutoDsmDesignTokensWorkspace";
import { SidebarNavInsetPage } from "../components/SidebarNavInsetPage";

function DesignTokensRouteView() {
  return (
    <SidebarNavInsetPage navLabel="Design tokens">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Design tokens</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Define and maintain colors, typography, spacing, and motion tokens shared across the
            product surface. Tokens auto-fill when you install a design system, and you can add or
            remove them at any time.
          </p>
        </header>
        <AutoDsmDesignTokensWorkspace />
      </div>
    </SidebarNavInsetPage>
  );
}

export const Route = createFileRoute("/_chat/design-tokens")({
  component: DesignTokensRouteView,
});
