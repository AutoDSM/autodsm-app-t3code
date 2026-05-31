"use client";

import type {
  AutoDsmBrandToken,
  AutoDsmBrandTokenCategory,
  AutoDsmBrandTokenDraft,
  AutoDsmBrandTokenPatch,
} from "@t3tools/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { useEffect, useMemo, useState, type JSX } from "react";

import { useUiStateStore } from "~/uiStateStore";
import { Button } from "~/components/ui/button";
import { Toggle, ToggleGroup } from "~/components/ui/toggle-group";
import { useAutoDsmInstallIconLibrary } from "~/hooks/useAutoDsmInstallIconLibrary";
import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";
import {
  autodsmAddBrandToken,
  autodsmBrandProfileQueryOptions,
  autodsmRemoveBrandToken,
  autodsmResyncBrandTokens,
  autodsmUpdateBrandToken,
  autodsmWorkspaceQueryKeys,
} from "~/lib/autodsmWorkspaceReactQuery";
import { filterBrandingColorTokens } from "~/lib/brandingColorTokens";
import {
  DESIGN_TOKEN_CATEGORIES,
  DESIGN_TOKEN_CATEGORY_LABEL,
  groupTokensByCategory,
} from "~/lib/designTokenGroups";

import { Route as DesignTokensRoute } from "~/routes/_chat.design-tokens";

import { AutoDsmDesignBriefDialog } from "./AutoDsmDesignBriefDialog";
import { DesignTokenColorsSection } from "./designTokens/DesignTokenColorsSection";
import { DesignTokenIconsSection } from "./designTokens/DesignTokenIconsSection";
import { DesignTokenMotionSection } from "./designTokens/DesignTokenMotionSection";
import { DesignTokenRadiiSection } from "./designTokens/DesignTokenRadiiSection";
import { DesignTokenSectionShell } from "./designTokens/DesignTokenSectionShell";
import { DesignTokenShadowsSection } from "./designTokens/DesignTokenShadowsSection";
import { DesignTokenSpacingSection } from "./designTokens/DesignTokenSpacingSection";
import { DesignTokenTypographySection } from "./designTokens/DesignTokenTypographySection";
import {
  EditDesignTokenDialog,
  type EditDesignTokenDialogMode,
} from "./designTokens/EditDesignTokenDialog";

const PILL_CLASSNAME =
  "rounded-full border border-border bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/50 hover:text-foreground data-pressed:bg-foreground data-pressed:text-background data-pressed:border-foreground";

const CATEGORY_DESCRIPTION: Record<AutoDsmBrandTokenCategory, string> = {
  color: "Semantic surface, action, foreground, and status colors from your design system.",
  typography: "Type scales with live sample rendering and font metadata.",
  spacing: "Spacing scale with proportional bars normalized to the largest token.",
  radius: "Corner radii previewed on sample boxes.",
  shadow: "Elevation shadows applied to preview tiles.",
  motion: "Transition durations and easing curves used across the system.",
  icon: "Browse icons from the installed library.",
};

function findIconLibraryToken(tokens: readonly AutoDsmBrandToken[]): AutoDsmBrandToken | null {
  return tokens.find((token) => (token.name ?? token.id).toLowerCase() === "icon-library") ?? null;
}

export function AutoDsmDesignTokensWorkspace(): JSX.Element {
  const { cwd, environmentId } = useAutoDsmWorkspace();
  const queryClient = useQueryClient();
  const installIconLibrary = useAutoDsmInstallIconLibrary();

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<EditDesignTokenDialogMode>("add");
  const [editingToken, setEditingToken] = useState<AutoDsmBrandToken | null>(null);
  const [briefDialogOpen, setBriefDialogOpen] = useState(false);

  const pendingDesignBriefMarkdown = useUiStateStore((s) => s.pendingDesignBriefMarkdown);
  const setPendingDesignBriefMarkdown = useUiStateStore((s) => s.setPendingDesignBriefMarkdown);

  // Onboarding hand-off: when the user lands on Design Tokens with a brief
  // they captured during onboarding, open the dialog so it gets uploaded +
  // proposed against the now-existing workspace.
  useEffect(() => {
    if (
      !briefDialogOpen &&
      cwd &&
      environmentId &&
      pendingDesignBriefMarkdown &&
      pendingDesignBriefMarkdown.trim().length > 0
    ) {
      setBriefDialogOpen(true);
    }
  }, [briefDialogOpen, cwd, environmentId, pendingDesignBriefMarkdown]);

  const { category: categoryFromSearch } = DesignTokensRoute.useSearch();
  const activeCategory: AutoDsmBrandTokenCategory = categoryFromSearch ?? "color";
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

  const brandingColorTokens = useMemo(() => {
    const colorGroup = groups.find((group) => group.category === "color");
    return filterBrandingColorTokens(colorGroup?.tokens ?? []);
  }, [groups]);

  const iconLibraryToken = useMemo(() => {
    const iconGroup = groups.find((group) => group.category === "icon");
    return findIconLibraryToken(iconGroup?.tokens ?? []);
  }, [groups]);

  const activeGroup = groups.find((group) => group.category === activeCategory) ?? {
    category: activeCategory,
    tokens: [],
  };

  const displayedTokens = activeCategory === "color" ? brandingColorTokens : activeGroup.tokens;

  const openAddDialog = (): void => {
    setDialogMode("add");
    setEditingToken(null);
    setDialogOpen(true);
  };

  const openEditDialog = (token: AutoDsmBrandToken): void => {
    setDialogMode("edit");
    setEditingToken(token);
    setDialogOpen(true);
  };

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

  const addTokenButton =
    activeCategory !== "icon" ? (
      <Button variant="outline" size="sm" onClick={openAddDialog}>
        <PlusIcon />
        Add token
      </Button>
    ) : null;

  const renderSection = (): JSX.Element => {
    switch (activeCategory) {
      case "color":
        return (
          <DesignTokenColorsSection
            tokens={displayedTokens}
            colorResolutionScope={activeGroup.tokens}
            onEditToken={openEditDialog}
          />
        );
      case "typography":
        return (
          <DesignTokenTypographySection tokens={displayedTokens} onEditToken={openEditDialog} />
        );
      case "spacing":
        return <DesignTokenSpacingSection tokens={displayedTokens} onEditToken={openEditDialog} />;
      case "radius":
        return <DesignTokenRadiiSection tokens={displayedTokens} onEditToken={openEditDialog} />;
      case "shadow":
        return <DesignTokenShadowsSection tokens={displayedTokens} onEditToken={openEditDialog} />;
      case "motion":
        return <DesignTokenMotionSection tokens={displayedTokens} onEditToken={openEditDialog} />;
      case "icon":
        return (
          <DesignTokenIconsSection
            iconLibraryToken={iconLibraryToken}
            installPending={installIconLibrary.isPending}
            onInstallLibrary={(library) => {
              installIconLibrary.mutate(library);
            }}
          />
        );
      default:
        return <p className="text-sm text-muted-foreground">Unknown token category.</p>;
    }
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setBriefDialogOpen(true)}>
            <SparklesIcon />
            Update from brief
          </Button>
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
      {installIconLibrary.isError ? (
        <p className="mb-3 text-xs text-destructive">
          Failed to install icon library. Please try again.
        </p>
      ) : null}

      <ToggleGroup
        className="mb-5 flex-wrap gap-2"
        value={[activeCategory]}
        onValueChange={(value) => {
          const next = value[0];
          if (
            next !== undefined &&
            (DESIGN_TOKEN_CATEGORIES as ReadonlyArray<string>).includes(next)
          ) {
            void navigate({
              search: { category: next as AutoDsmBrandTokenCategory },
              replace: true,
            });
          }
        }}
        aria-label="Token category"
      >
        {DESIGN_TOKEN_CATEGORIES.map((category) => (
          <Toggle key={category} value={category} className={PILL_CLASSNAME}>
            {DESIGN_TOKEN_CATEGORY_LABEL[category]}
          </Toggle>
        ))}
      </ToggleGroup>

      <DesignTokenSectionShell
        title={DESIGN_TOKEN_CATEGORY_LABEL[activeCategory]}
        description={CATEGORY_DESCRIPTION[activeCategory]}
        headerAction={addTokenButton}
      >
        {renderSection()}
      </DesignTokenSectionShell>

      {activeCategory !== "icon" ? (
        <EditDesignTokenDialog
          open={dialogOpen}
          mode={dialogMode}
          category={activeCategory}
          token={editingToken}
          onOpenChange={setDialogOpen}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          addPending={addMutation.isPending}
          updatePending={updateMutation.isPending}
          removePending={removingId !== null && removeMutation.isPending}
        />
      ) : null}

      <AutoDsmDesignBriefDialog
        cwd={cwd}
        environmentId={environmentId}
        initialMarkdown={pendingDesignBriefMarkdown}
        onApplied={(result) => {
          queryClient.setQueryData(brandKey, result.profile);
        }}
        onInitialMarkdownConsumed={() => setPendingDesignBriefMarkdown(null)}
        onOpenChange={setBriefDialogOpen}
        open={briefDialogOpen}
      />
    </div>
  );
}
