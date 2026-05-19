"use client";

import type { AutoDsmBrandTokenDraft, AutoDsmBrandTokenPatch } from "@t3tools/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { useMemo, useState, type JSX } from "react";

import { Button } from "~/components/ui/button";
import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";
import {
  autodsmAddBrandToken,
  autodsmBrandProfileQueryOptions,
  autodsmRemoveBrandToken,
  autodsmResyncBrandTokens,
  autodsmUpdateBrandToken,
  autodsmWorkspaceQueryKeys,
} from "~/lib/autodsmWorkspaceReactQuery";
import { DESIGN_TOKEN_CATEGORY_LABEL, groupTokensByCategory } from "~/lib/designTokenGroups";

import { DesignTokenSection } from "./DesignTokenSection";
import { DesignTokenTable } from "./DesignTokenTable";

export function AutoDsmDesignTokensWorkspace(): JSX.Element {
  const { cwd, environmentId } = useAutoDsmWorkspace();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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

      {groups.map((group) => (
        <DesignTokenSection
          key={group.category}
          title={DESIGN_TOKEN_CATEGORY_LABEL[group.category]}
          count={group.tokens.length}
        >
          <DesignTokenTable
            category={group.category}
            tokens={group.tokens}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            addPending={addMutation.isPending}
            updatePending={updateMutation.isPending}
            removingId={removingId}
            editingId={editingId}
            onEditingIdChange={setEditingId}
          />
        </DesignTokenSection>
      ))}
    </div>
  );
}
