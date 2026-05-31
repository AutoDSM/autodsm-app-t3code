import { createFileRoute } from "@tanstack/react-router";

import { AutoDsmDesignTokensWorkspace } from "~/components/autodsm/AutoDsmDesignTokensWorkspace";
import { DESIGN_TOKEN_CATEGORIES } from "~/lib/designTokenGroups";
import { SidebarNavInsetPage } from "../components/SidebarNavInsetPage";

import type { AutoDsmBrandTokenCategory } from "@t3tools/contracts";

export interface DesignTokensSearch {
  readonly category?: AutoDsmBrandTokenCategory;
}

function DesignTokensRouteView() {
  return (
    <SidebarNavInsetPage navLabel="Design tokens">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Design tokens</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Define and maintain colors, typography, spacing, radii, shadows, motion, and icon tokens
            shared across the product surface. Tokens auto-fill when you install a design system,
            and you can add or remove them at any time.
          </p>
        </header>
        <AutoDsmDesignTokensWorkspace />
      </div>
    </SidebarNavInsetPage>
  );
}

export const Route = createFileRoute("/_chat/design-tokens")({
  component: DesignTokensRouteView,
  validateSearch: (raw: Record<string, unknown>): DesignTokensSearch => {
    const out: { category?: AutoDsmBrandTokenCategory } = {};
    const categoryCandidate = typeof raw.category === "string" ? raw.category : undefined;
    if (
      categoryCandidate !== undefined &&
      (DESIGN_TOKEN_CATEGORIES as ReadonlyArray<string>).includes(categoryCandidate)
    ) {
      out.category = categoryCandidate as AutoDsmBrandTokenCategory;
    }
    return out;
  },
});
