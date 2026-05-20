import { createFileRoute } from "@tanstack/react-router";

import { AutoDsmDesignTokensWorkspace } from "~/components/autodsm/AutoDsmDesignTokensWorkspace";
import type { ColorTier } from "~/lib/colorTokenTiers";
import { DESIGN_TOKEN_CATEGORIES } from "~/lib/designTokenGroups";
import { SidebarNavInsetPage } from "../components/SidebarNavInsetPage";

import type { AutoDsmBrandTokenCategory } from "@t3tools/contracts";

const COLOR_TIERS: ReadonlyArray<ColorTier> = ["global", "semantic"];

export interface DesignTokensSearch {
  readonly category?: AutoDsmBrandTokenCategory;
  readonly tier?: ColorTier;
}

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
  validateSearch: (raw: Record<string, unknown>): DesignTokensSearch => {
    const out: { category?: AutoDsmBrandTokenCategory; tier?: ColorTier } = {};
    const categoryCandidate = typeof raw.category === "string" ? raw.category : undefined;
    if (
      categoryCandidate !== undefined &&
      (DESIGN_TOKEN_CATEGORIES as ReadonlyArray<string>).includes(categoryCandidate)
    ) {
      out.category = categoryCandidate as AutoDsmBrandTokenCategory;
    }
    const tierCandidate = typeof raw.tier === "string" ? raw.tier : undefined;
    if (
      tierCandidate !== undefined &&
      (COLOR_TIERS as ReadonlyArray<string>).includes(tierCandidate)
    ) {
      out.tier = tierCandidate as ColorTier;
    }
    return out;
  },
});
