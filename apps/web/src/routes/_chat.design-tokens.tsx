import { createFileRoute } from "@tanstack/react-router";

import { SidebarNavInsetPage } from "../components/SidebarNavInsetPage";

function DesignTokensRouteView() {
  return (
    <SidebarNavInsetPage navLabel="Design tokens">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Design tokens</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Define and maintain colors, typography, spacing, and motion tokens shared across the
          product surface.
        </p>
      </div>
    </SidebarNavInsetPage>
  );
}

export const Route = createFileRoute("/_chat/design-tokens")({
  component: DesignTokensRouteView,
});
