"use client";

import type {
  AutoDsmBrandTokenCategory,
  AutoDsmBrandTokenDraft,
  AutoDsmBrandTokenPatch,
} from "@t3tools/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { useMemo, useState, type JSX } from "react";

import { Button } from "~/components/ui/button";
import { Toggle, ToggleGroup } from "~/components/ui/toggle-group";
import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";
import {
  autodsmAddBrandToken,
  autodsmBrandProfileQueryOptions,
  autodsmRemoveBrandToken,
  autodsmResyncBrandTokens,
  autodsmUpdateBrandToken,
  autodsmWorkspaceQueryKeys,
} from "~/lib/autodsmWorkspaceReactQuery";
import { partitionColorsByTier, type ColorTier } from "~/lib/colorTokenTiers";
import {
  DESIGN_TOKEN_CATEGORIES,
  DESIGN_TOKEN_CATEGORY_LABEL,
  groupTokensByCategory,
} from "~/lib/designTokenGroups";

import { Route as DesignTokensRoute } from "~/routes/_chat.design-tokens";

import { DesignTokenTable } from "./DesignTokenTable";

const PILL_CLASSNAME =
  "rounded-full border border-border bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/50 hover:text-foreground data-pressed:bg-foreground data-pressed:text-background data-pressed:border-foreground";
const PILL_COUNT_CLASSNAME = "ml-1.5 text-muted-foreground in-data-pressed:text-background/70";

const SECONDARY_PILL_CLASSNAME =
  "rounded-full border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/50 hover:text-foreground data-pressed:bg-foreground data-pressed:text-background data-pressed:border-foreground";
const SECONDARY_PILL_COUNT_CLASSNAME =
  "ml-1.5 text-muted-foreground in-data-pressed:text-background/70";

const COLOR_TIERS: ReadonlyArray<ColorTier> = ["global", "semantic"];
const COLOR_TIER_LABEL: Record<ColorTier, string> = {
  global: "Global",
  semantic: "Semantic",
};

export function AutoDsmDesignTokensWorkspace(): JSX.Element {
  const { cwd, environmentId } = useAutoDsmWorkspace();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { category: categoryFromSearch, tier: tierFromSearch } = DesignTokensRoute.useSearch();
  const activeCategory: AutoDsmBrandTokenCategory = categoryFromSearch ?? "color";
  const activeTier: ColorTier = tierFromSearch ?? "global";
  const navigate = DesignTokensRoute.useNavigate();

  const brandQuery = useQuery(autodsmBrandProfileQueryOptions({ environmentId, cwd }));
  const brandKey = autodsmWorkspaceQueryKeys.brandProfile(environmentId, cwd);

  const addMutation = useMutation({
    mutationFn: (draft: AutoDsmBrandTokenDraft) => {
      if (!cwd || !environmentId) {
        throw new Error("Workspace unavailable.");
      }
      return autodsmAddBrandToken({ environmentId, cwd, token: draft });
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(brandKey, profile);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { tokenId: string; patch: AutoDsmBrandTokenPatch }) => {
      if (!cwd || !environmentId) {
        throw new Error("Workspace unavailable.");
      }
      return autodsmUpdateBrandToken({
        environmentId,
        cwd,
        tokenId: input.tokenId,
        patch: input.patch,
      });
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(brandKey, profile);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (tokenId: string) => {
      if (!cwd || !environmentId) {
        throw new Error("Workspace unavailable.");
      }
      return autodsmRemoveBrandToken({ environmentId, cwd, tokenId });
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(brandKey, profile);
    },
  });

  const resyncMutation = useMutation({
    mutationFn: () => {
      if (!cwd || !environmentId) {
        throw new Error("Workspace unavailable.");
      }
      return autodsmResyncBrandTokens({ environmentId, cwd });
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(brandKey, profile);
    },
  });

  const groups = useMemo(
    () => groupTokensByCategory(brandQuery.data?.tokens ?? []),
    [brandQuery.data?.tokens],
  );

  const tokenCount = brandQuery.data?.tokens.length ?? 0;

  const countsByCategory = useMemo<Record<AutoDsmBrandTokenCategory, number>>(() => {
    const map: Record<AutoDsmBrandTokenCategory, number> = {
      color: 0,
      typography: 0,
      spacing: 0,
      motion: 0,
    };
    for (const group of groups) {
      map[group.category] = group.tokens.length;
    }
    return map;
  }, [groups]);

  const activeGroup = groups.find((group) => group.category === activeCategory) ?? {
    category: activeCategory,
    tokens: [],
  };

  const colorPartition = useMemo(
    () =>
      activeCategory === "color"
        ? partitionColorsByTier(activeGroup.tokens)
        : { globals: [], semantics: [] },
    [activeCategory, activeGroup.tokens],
  );

  const displayedTokens =
    activeCategory === "color"
      ? activeTier === "semantic"
        ? colorPartition.semantics
        : colorPartition.globals
      : activeGroup.tokens;

  const handleAdd = async (draft: AutoDsmBrandTokenDraft): Promise<void> => {
    await addMutation.mutateAsync(draft);
  };

  const handleUpdate = async (tokenId: string, patch: AutoDsmBrandTokenPatch): Promise<void> => {
    await updateMutation.mutateAsync({ tokenId, patch });
  };

  const handleRemove = (tokenId: string): void => {
    setRemovingId(tokenId);
    removeMutation.mutate(tokenId, {
      onSettled: () => {
        setRemovingId(null);
      },
    });
  };

  if (!cwd || !environmentId) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/5 px-6 py-10 text-sm text-muted-foreground">
        Open a project from Home to load design tokens for this workspace.
      </div>
    );
  }

  if (brandQuery.isPending) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/15 px-6 py-10 text-sm text-muted-foreground">
        Loading design tokens…
      </div>
    );
  }

  if (brandQuery.isError) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-10 text-sm text-destructive">
        Failed to load design tokens for this workspace.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {tokenCount} token{tokenCount === 1 ? "" : "s"} indexed
          {brandQuery.data?.status === "partial"
            ? " (partial — resync to fill from design system)"
            : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={resyncMutation.isPending}
          onClick={() => {
            resyncMutation.mutate();
          }}
        >
          <RefreshCwIcon className={resyncMutation.isPending ? "animate-spin" : undefined} />
          Resync from design system
        </Button>
      </div>

      {resyncMutation.isError ? (
        <p className="mb-3 text-xs text-destructive">Failed to resync tokens. Please try again.</p>
      ) : null}
      {updateMutation.isError ? (
        <p className="mb-3 text-xs text-destructive">Failed to update token. Please try again.</p>
      ) : null}
      {removeMutation.isError ? (
        <p className="mb-3 text-xs text-destructive">Failed to remove token. Please try again.</p>
      ) : null}

      <ToggleGroup
        className="mb-4 flex-wrap gap-2"
        value={[activeCategory]}
        onValueChange={(value) => {
          const next = value[0];
          if (
            next !== undefined &&
            (DESIGN_TOKEN_CATEGORIES as ReadonlyArray<string>).includes(next)
          ) {
            const search: { category: AutoDsmBrandTokenCategory; tier?: ColorTier } = {
              category: next as AutoDsmBrandTokenCategory,
            };
            // Carry tier forward only when staying in colors; drop it for other categories.
            if (next === "color" && tierFromSearch !== undefined) {
              search.tier = tierFromSearch;
            }
            void navigate({ search, replace: true });
          }
        }}
        aria-label="Token category"
      >
        {DESIGN_TOKEN_CATEGORIES.map((category) => (
          <Toggle key={category} value={category} className={PILL_CLASSNAME}>
            {DESIGN_TOKEN_CATEGORY_LABEL[category]}
            <span className={PILL_COUNT_CLASSNAME}>· {countsByCategory[category]}</span>
          </Toggle>
        ))}
      </ToggleGroup>

      {activeCategory === "color" ? (
        <ToggleGroup
          className="mb-5 flex-wrap gap-1.5"
          value={[activeTier]}
          onValueChange={(value) => {
            const next = value[0];
            if (next !== undefined && (COLOR_TIERS as ReadonlyArray<string>).includes(next)) {
              void navigate({
                search: { category: "color", tier: next as ColorTier },
                replace: true,
              });
            }
          }}
          aria-label="Color tier"
        >
          {COLOR_TIERS.map((tier) => (
            <Toggle key={tier} value={tier} className={SECONDARY_PILL_CLASSNAME}>
              {COLOR_TIER_LABEL[tier]}
              <span className={SECONDARY_PILL_COUNT_CLASSNAME}>
                ·{" "}
                {tier === "semantic"
                  ? colorPartition.semantics.length
                  : colorPartition.globals.length}
              </span>
            </Toggle>
          ))}
        </ToggleGroup>
      ) : null}

      <DesignTokenTable
        key={`${activeGroup.category}:${activeCategory === "color" ? activeTier : "all"}`}
        category={activeGroup.category}
        tokens={displayedTokens}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
        addPending={addMutation.isPending}
        updatePending={updateMutation.isPending}
        removingId={removingId}
        editingId={editingId}
        onEditingIdChange={setEditingId}
        {...(activeCategory === "color"
          ? {
              colorResolutionScope: activeGroup.tokens,
              emptyMessage:
                activeTier === "semantic"
                  ? "No semantic colors yet — semantic tokens reference globals via var(--name)."
                  : "No global colors yet — resync from your design system or add one below.",
            }
          : {})}
      />
    </div>
  );
}
