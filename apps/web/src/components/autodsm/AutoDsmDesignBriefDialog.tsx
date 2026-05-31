"use client";

import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";

import type {
  AutoDsmDesignBriefApplyResult,
  AutoDsmDesignBriefProposal,
  EnvironmentId,
} from "@t3tools/contracts";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  autodsmProposeDesignBrief,
  autodsmUploadDesignBrief,
} from "~/lib/autodsmWorkspaceReactQuery";
import { useSettings } from "~/hooks/useSettings";
import { useServerProviders } from "~/rpc/serverState";
import { resolveAppModelSelectionState } from "~/modelSelection";

import { AutoDsmDesignBriefProposalReview } from "./AutoDsmDesignBriefProposalReview";
import { AutoDsmDesignBriefUploader } from "./AutoDsmDesignBriefUploader";

export interface AutoDsmDesignBriefDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  /**
   * When provided, this markdown is uploaded + proposed immediately on open
   * (skipping the upload UI). Used for the onboarding hand-off: the user
   * captured a brief during onboarding and we apply it on first workspace
   * visit. Consumers should clear their source state once `onConsumed` is
   * called so this only runs once.
   */
  readonly initialMarkdown?: string | null;
  readonly onInitialMarkdownConsumed?: () => void;
  /** Invoked after a successful apply (the parent re-fetches brand profile). */
  readonly onApplied?: (result: AutoDsmDesignBriefApplyResult) => void;
}

type Pane =
  | { readonly kind: "upload" }
  | { readonly kind: "loading" }
  | { readonly kind: "proposal"; readonly proposal: AutoDsmDesignBriefProposal }
  | { readonly kind: "error"; readonly message: string };

/**
 * Wraps the uploader + proposal review in a modal dialog. Supports two entry
 * points:
 *   1. Workspace button click — open with no initial markdown; user uploads.
 *   2. Onboarding hand-off — open with `initialMarkdown` so we silently
 *      upload + propose against the freshly created workspace, landing the
 *      user directly on the review pane.
 */
export function AutoDsmDesignBriefDialog(props: AutoDsmDesignBriefDialogProps): JSX.Element {
  const {
    open,
    onOpenChange,
    environmentId,
    cwd,
    initialMarkdown,
    onInitialMarkdownConsumed,
    onApplied,
  } = props;
  const [pane, setPane] = useState<Pane>({ kind: "upload" });
  const settings = useSettings();
  const providers = useServerProviders();
  const modelSelection = useMemo(
    () => resolveAppModelSelectionState(settings, providers),
    [settings, providers],
  );
  const modelLabel = modelSelection.model;

  // Reset pane state whenever the dialog opens/closes to avoid stale data.
  useEffect(() => {
    if (!open) {
      setPane({ kind: "upload" });
    }
  }, [open]);

  // Onboarding hand-off: when opened with initialMarkdown, do the
  // upload→propose round-trip automatically.
  useEffect(() => {
    if (!open || !initialMarkdown || initialMarkdown.trim().length === 0) {
      return;
    }
    let cancelled = false;
    setPane({ kind: "loading" });
    void (async () => {
      try {
        await autodsmUploadDesignBrief({ environmentId, cwd, markdown: initialMarkdown });
        const { proposal } = await autodsmProposeDesignBrief({
          environmentId,
          cwd,
          modelSelection,
        });
        if (cancelled) return;
        setPane({ kind: "proposal", proposal });
      } catch (cause) {
        if (cancelled) return;
        const message = cause instanceof Error ? cause.message : "Failed to analyze saved brief.";
        setPane({ kind: "error", message });
      } finally {
        onInitialMarkdownConsumed?.();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, initialMarkdown, environmentId, cwd, onInitialMarkdownConsumed, modelSelection]);

  const reanalyze = async (): Promise<void> => {
    setPane({ kind: "loading" });
    try {
      const { proposal } = await autodsmProposeDesignBrief({
        environmentId,
        cwd,
        modelSelection,
      });
      setPane({ kind: "proposal", proposal });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Failed to re-analyze brief.";
      setPane({ kind: "error", message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update from brief</DialogTitle>
          <DialogDescription>
            Upload a <code className="rounded bg-muted px-1 py-0.5">design.md</code> describing your
            aesthetic. We&apos;ll propose token changes you can review before applying.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {pane.kind === "loading" ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
              <span>
                {modelLabel ? `Analyzing your brief with ${modelLabel}…` : "Analyzing your brief…"}
              </span>
              <span className="text-xs text-muted-foreground/70">
                Rich briefs can take a minute.
              </span>
            </div>
          ) : null}

          {pane.kind === "error" ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {pane.message}
              </div>
              <button
                className="self-end text-xs font-medium text-primary hover:underline"
                onClick={() => setPane({ kind: "upload" })}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : null}

          {pane.kind === "upload" ? (
            <AutoDsmDesignBriefUploader
              cwd={cwd}
              environmentId={environmentId}
              mode="workspace"
              modelLabel={modelLabel}
              modelSelection={modelSelection}
              onProposalReady={(proposal) => setPane({ kind: "proposal", proposal })}
            />
          ) : null}

          {pane.kind === "proposal" ? (
            <AutoDsmDesignBriefProposalReview
              cwd={cwd}
              environmentId={environmentId}
              onApplied={(result) => {
                onApplied?.(result);
                // Leave the panel open so the user sees the outcome banner.
              }}
              onCancel={() => onOpenChange(false)}
              onRequestReanalyze={() => {
                void reanalyze();
              }}
              proposal={pane.proposal}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
