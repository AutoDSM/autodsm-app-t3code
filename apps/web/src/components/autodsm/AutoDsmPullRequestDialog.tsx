import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { EnvironmentId } from "@t3tools/contracts";
import { GitPullRequestIcon, CheckIcon, SparklesIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Spinner } from "~/components/ui/spinner";
import { Checkbox } from "~/components/ui/checkbox";
import {
  autodsmComponentAgentsQueryOptions,
  autodsmSessionChangeSetsQueryOptions,
  autodsmCreatePullRequest,
  autodsmPullRequestsQueryOptions,
  autodsmWorkspaceQueryKeys,
} from "~/lib/autodsmWorkspaceReactQuery";
import { cn } from "~/lib/utils";
import { useComponentPreviewOverlaySuppression } from "~/hooks/useComponentPreviewOverlaySuppression";
import { useAutoDsmCaptureChangeSet } from "~/hooks/useAutoDsmCaptureChangeSet";
import { AutoDsmHunkReviewPanel } from "~/components/autodsm/AutoDsmHunkReviewPanel";

interface AutoDsmPullRequestDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
}

export function AutoDsmPullRequestDialog({
  open,
  onOpenChange,
  environmentId,
  cwd,
}: AutoDsmPullRequestDialogProps) {
  useComponentPreviewOverlaySuppression(open, "dialog");
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [selectedChangeSets, setSelectedChangeSets] = useState<Record<string, boolean>>({});

  // Query Component Agents
  const agentsQuery = useQuery(
    autodsmComponentAgentsQueryOptions({ environmentId, cwd, enabled: open }),
  );
  const agents = agentsQuery.data?.manifest.agents ?? [];

  useEffect(() => {
    const firstAgent = agents[0];
    if (open && firstAgent && !selectedSessionId) {
      setSelectedSessionId(firstAgent.sessionId);
    }
  }, [open, agents, selectedSessionId]);

  // Query ChangeSets for the selected session
  const changeSetsQuery = useQuery(
    autodsmSessionChangeSetsQueryOptions({
      environmentId,
      cwd,
      sessionId: selectedSessionId || null,
      enabled: open && !!selectedSessionId,
    }),
  );
  const changeSets = changeSetsQuery.data?.changeSets ?? [];

  const selectedAgent = agents.find((agent) => agent.sessionId === selectedSessionId);
  const selectedThreadId = selectedAgent?.threadId ?? null;

  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  const { canCapture, capture } = useAutoDsmCaptureChangeSet({
    environmentId,
    cwd,
    threadId: selectedThreadId,
  });

  const invalidateChangeSets = async () => {
    if (selectedSessionId) {
      await queryClient.invalidateQueries({
        queryKey: autodsmWorkspaceQueryKeys.sessionChangeSets(
          environmentId,
          cwd,
          selectedSessionId,
        ),
      });
    }
    await queryClient.invalidateQueries({
      queryKey: autodsmWorkspaceQueryKeys.activity(environmentId, cwd),
    });
  };

  const captureMutation = useMutation({
    mutationFn: capture,
    onSuccess: async (changeSet) => {
      await invalidateChangeSets();
      if (changeSet) {
        setExpandedReviewId(changeSet.id);
      }
    },
  });

  // Reset checkboxes when changesets load
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const cs of changeSets) {
      if (cs && cs.id) {
        initial[cs.id] = true;
      }
    }
    setSelectedChangeSets(initial);
  }, [changeSets]);

  // Create PR Mutation
  const createPrMutation = useMutation({
    mutationFn: async () => {
      const activeIds = Object.entries(selectedChangeSets)
        .filter(([_, checked]) => checked)
        .map(([id]) => id);

      if (activeIds.length === 0) {
        throw new Error("You must select at least one changeset to bundle.");
      }

      const activeSummary = summary.trim() || undefined;
      return autodsmCreatePullRequest({
        environmentId,
        cwd,
        title: title.trim(),
        ...(activeSummary ? { summary: activeSummary } : {}),
        changeSetIds: activeIds,
      });
    },
    onSuccess: async () => {
      // Invalidate queries to refresh lists
      await queryClient.invalidateQueries({
        queryKey: autodsmWorkspaceQueryKeys.pullRequests(environmentId, cwd),
      });
      await queryClient.invalidateQueries({
        queryKey: autodsmWorkspaceQueryKeys.activity(environmentId, cwd),
      });
      // Reset form
      setTitle("");
      setSummary("");
      onOpenChange(false);
    },
  });

  const toggleChangeSet = (id: string) => {
    setSelectedChangeSets((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleConfirm = () => {
    if (!title.trim()) return;
    createPrMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <GitPullRequestIcon className="size-5 text-primary" />
            Create Local Pull Request
          </DialogTitle>
          <DialogDescription>
            Bundle component changesets into a local pull request to review changes, track status,
            and merge.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel className="space-y-4 py-2">
          {/* Dropdown to select component agent/session */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Select Component Thread</label>
            {agentsQuery.isPending ? (
              <div className="flex h-9 items-center justify-center rounded-lg border border-border bg-muted/20">
                <Spinner className="size-4" />
              </div>
            ) : agents.length === 0 ? (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning-foreground">
                No active component sessions found. Generate component edits first to create
                changesets.
              </div>
            ) : (
              <select
                className="flex h-9 w-full rounded-lg border border-border bg-popover px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
              >
                {agents.map((agent) => (
                  <option key={agent.sessionId} value={agent.sessionId}>
                    {agent.title} ({agent.componentPath})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* List of changesets */}
          {selectedSessionId && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-foreground">Select Changesets</label>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={!canCapture || captureMutation.isPending}
                  onClick={() => captureMutation.mutate()}
                  title={
                    canCapture
                      ? "Capture this component thread's edits as a reviewable changeset"
                      : "No completed edits to capture yet"
                  }
                >
                  {captureMutation.isPending ? (
                    <Spinner className="size-3" />
                  ) : (
                    <SparklesIcon className="size-3" />
                  )}
                  Capture edits for review
                </Button>
              </div>
              {captureMutation.isError && (
                <p className="text-[11px] text-destructive">
                  {captureMutation.error instanceof Error
                    ? captureMutation.error.message
                    : "Failed to capture edits."}
                </p>
              )}
              {changeSetsQuery.isPending ? (
                <div className="flex h-20 items-center justify-center rounded-lg border border-border bg-muted/20">
                  <Spinner className="size-4" />
                </div>
              ) : changeSets.length === 0 ? (
                <div className="rounded-lg border border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                  No changesets found in this component session.
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/10 p-2 space-y-2">
                  {changeSets.map((cs) => {
                    const isChecked = !!selectedChangeSets[cs.id];
                    const hunkCount = cs.hunks?.length ?? 0;
                    const isReviewing = expandedReviewId === cs.id;
                    return (
                      <div key={cs.id}>
                        <div
                          onClick={() => toggleChangeSet(cs.id)}
                          className={cn(
                            "flex cursor-pointer items-start gap-2.5 rounded-md p-2 transition-colors hover:bg-muted/40",
                            isChecked && "bg-muted/20",
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleChangeSet(cs.id)}
                          />
                          <div className="min-w-0 flex-1 text-xs">
                            <p className="font-semibold text-foreground truncate">
                              ChangeSet {cs.id.substring(0, 8)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {cs.ops.length} file operation(s) ·{" "}
                              {new Date(cs.createdAt).toLocaleString()}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {cs.ops.map((op, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block rounded bg-muted-foreground/10 px-1 py-0.5 text-[9px] text-muted-foreground"
                                >
                                  {op.path}
                                </span>
                              ))}
                              {hunkCount > 0 && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setExpandedReviewId(isReviewing ? null : cs.id);
                                  }}
                                  className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary hover:bg-primary/20"
                                >
                                  {isReviewing
                                    ? "Hide"
                                    : `Review ${hunkCount} hunk${hunkCount === 1 ? "" : "s"}`}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        {isReviewing && hunkCount > 0 && (
                          <div className="mt-1 max-h-[50vh] overflow-y-auto rounded-md border border-border bg-background/40 p-2">
                            <AutoDsmHunkReviewPanel
                              environmentId={environmentId}
                              cwd={cwd}
                              changeSet={cs}
                              onApplied={() => {
                                void invalidateChangeSets();
                                setExpandedReviewId(null);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Form details */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">PR Title *</label>
              <Input
                placeholder="e.g. Add primary and secondary button components"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Summary / Details</label>
              <Textarea
                placeholder="Describe the changes in this pull request..."
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
          </div>

          {createPrMutation.isError && (
            <p className="text-xs text-destructive">
              {createPrMutation.error instanceof Error
                ? createPrMutation.error.message
                : "Failed to create pull request."}
            </p>
          )}
        </DialogPanel>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={createPrMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={!title.trim() || createPrMutation.isPending || changeSets.length === 0}
          >
            {createPrMutation.isPending ? (
              <span className="flex items-center gap-1.5">
                <Spinner className="size-3.5" />
                Creating...
              </span>
            ) : (
              "Create Pull Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
