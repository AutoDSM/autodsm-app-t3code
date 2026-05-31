import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { EnvironmentId } from "@t3tools/contracts";
import { ShieldCheckIcon, CopyIcon, CheckIcon, AlertTriangleIcon, PackageIcon } from "lucide-react";

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
import { Spinner } from "~/components/ui/spinner";
import { Checkbox } from "~/components/ui/checkbox";
import {
  autodsmExportPublishedExport,
  autodsmPullRequestsQueryOptions,
  autodsmWorkspaceQueryKeys,
} from "~/lib/autodsmWorkspaceReactQuery";
import { recordAutoDsmPublishStats } from "~/lib/supabase/publishStats";
import { recordAutoDsmTelemetry } from "~/lib/supabase/telemetry";
import { cn } from "~/lib/utils";
import { useComponentPreviewOverlaySuppression } from "~/hooks/useComponentPreviewOverlaySuppression";

interface AutoDsmPublishDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
}

type PublishMode = "local" | "github" | "npm";

export function AutoDsmPublishDialog({
  open,
  onOpenChange,
  environmentId,
  cwd,
}: AutoDsmPublishDialogProps) {
  useComponentPreviewOverlaySuppression(open, "dialog");
  const queryClient = useQueryClient();
  const [publishMode, setPublishMode] = useState<PublishMode>("local");
  const [version, setVersion] = useState("1.0.0");
  const [registryUrl, setRegistryUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<any>(null);

  // Sync default registry URLs based on mode
  useEffect(() => {
    if (publishMode === "github") {
      setRegistryUrl("https://npm.pkg.github.com");
    } else if (publishMode === "npm") {
      setRegistryUrl("https://registry.npmjs.org");
    } else {
      setRegistryUrl("");
    }
  }, [publishMode]);

  // Version bump helpers
  const bumpVersion = (type: "patch" | "minor" | "major") => {
    const parts = version.split(".").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return;
    const [major, minor, patch] = parts;
    if (major === undefined || minor === undefined || patch === undefined) return;

    if (type === "patch") {
      setVersion(`${major}.${minor}.${patch + 1}`);
    } else if (type === "minor") {
      setVersion(`${major}.${minor + 1}.0`);
    } else if (type === "major") {
      setVersion(`${major + 1}.0.0`);
    }
  };

  // Publish Mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const activeVersion = version.trim() || undefined;
      const activeRegistryUrl =
        publishMode !== "local" ? registryUrl.trim() || undefined : undefined;
      const activeAuthToken = publishMode !== "local" ? authToken.trim() || undefined : undefined;

      return autodsmExportPublishedExport({
        environmentId,
        cwd,
        ...(activeVersion ? { version: activeVersion } : {}),
        ...(activeRegistryUrl ? { registryUrl: activeRegistryUrl } : {}),
        ...(activeAuthToken ? { authToken: activeAuthToken } : {}),
      });
    },
    onSuccess: (data) => {
      setPublishResult(data);
      recordAutoDsmTelemetry("autodsm.publish.completed", {
        version: data.version,
        packageName: data.packageName,
      });
      void recordAutoDsmPublishStats({
        workspaceId: data.workspaceId,
        packageName: data.packageName,
        version: data.version,
        componentCount: data.componentCount,
        tokenCount: data.tokenCount,
      });
      // Invalidate activity
      void queryClient.invalidateQueries({
        queryKey: autodsmWorkspaceQueryKeys.activity(environmentId, cwd),
      });
    },
  });

  const handleCopy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleConfirm = () => {
    publishResult ? onOpenChange(false) : publishMutation.mutate();
  };

  // Reset screen states on open
  useEffect(() => {
    if (open) {
      setPublishResult(null);
      publishMutation.reset();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <PackageIcon className="size-5 text-primary" />
            Publish Design System
          </DialogTitle>
          <DialogDescription>
            Compile components via `tsup`, package styles, and publish to npm or local exports.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel className="space-y-4 py-2">
          {publishResult ? (
            /* Success Screen */
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-2 rounded-xl border border-success/30 bg-success/5 p-6 text-center">
                <ShieldCheckIcon className="size-10 text-success" />
                <h3 className="text-sm font-semibold text-foreground">
                  Design System Published Successfully!
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Package{" "}
                  <span className="font-semibold text-foreground">{publishResult.packageName}</span>{" "}
                  (v{publishResult.version}) has been compiled and is ready for use.
                </p>
              </div>

              {/* Install and Import guides */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    How to install this package
                  </span>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5">
                    <code className="text-xs text-foreground font-mono truncate select-all">
                      npm install {publishResult.packageName}@{publishResult.version}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        handleCopy(
                          `npm install ${publishResult.packageName}@${publishResult.version}`,
                          "install",
                        )
                      }
                    >
                      {copiedText === "install" ? (
                        <CheckIcon className="size-3.5 text-success" />
                      ) : (
                        <CopyIcon className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    How to use in React
                  </span>
                  <div className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] text-foreground space-y-1">
                    <p className="text-primary-foreground/70">// Import component & styles</p>
                    <p>
                      <span className="text-pink-500">import</span> {"{"} Button, Card {"}"}{" "}
                      <span className="text-pink-500">from</span>{" "}
                      <span className="text-emerald-500">'{publishResult.packageName}'</span>;
                    </p>
                    <p>
                      <span className="text-pink-500">import</span>{" "}
                      <span className="text-emerald-500">
                        '{publishResult.packageName}/index.css'
                      </span>
                      ;
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/10 p-2.5 text-[11px] border border-border/40 text-muted-foreground space-y-1">
                  <p>
                    <span className="font-semibold text-foreground">Local Build Path:</span>{" "}
                    <code className="select-all">{publishResult.exportPath}</code>
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Build Summary:</span>{" "}
                    {publishResult.componentCount} components · {publishResult.tokenCount} design
                    tokens
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Configure Settings Screen */
            <div className="space-y-4">
              {/* Select target */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Publish Destination</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPublishMode("local")}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all hover:bg-muted/35",
                      publishMode === "local"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-popover",
                    )}
                  >
                    <PackageIcon className="size-4.5 mb-1 text-muted-foreground" />
                    <span className="text-[11px] font-semibold">Local Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishMode("github")}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all hover:bg-muted/35",
                      publishMode === "github"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-popover",
                    )}
                  >
                    <span className="text-sm mb-0.5 font-bold">GH</span>
                    <span className="text-[11px] font-semibold">GitHub Registry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishMode("npm")}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all hover:bg-muted/35",
                      publishMode === "npm"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-popover",
                    )}
                  >
                    <span className="text-sm mb-0.5 font-bold text-red-500">npm</span>
                    <span className="text-[11px] font-semibold">npmjs.com</span>
                  </button>
                </div>
              </div>

              {/* Version Bump Form */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Release Version</label>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="e.g. 1.0.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="h-9"
                    onClick={() => bumpVersion("patch")}
                  >
                    + Patch
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="h-9"
                    onClick={() => bumpVersion("minor")}
                  >
                    + Minor
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="h-9"
                    onClick={() => bumpVersion("major")}
                  >
                    + Major
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Valid SemVer tag. If Git is active, this version will be committed to
                  `package.json` and tagged locally as `v{version}`.
                </p>
              </div>

              {/* Registry parameters if remote */}
              {publishMode !== "local" && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Registry URL</label>
                    <Input
                      placeholder="https://registry.npmjs.org"
                      value={registryUrl}
                      onChange={(e) => setRegistryUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Access Token</label>
                    <Input
                      type="password"
                      placeholder="Paste NPM / GitHub Personal Access Token (PAT)"
                      value={authToken}
                      onChange={(e) => setAuthToken(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      This token is stored securely on the server and injected dynamically into a
                      temporary `.npmrc` during compile.
                    </p>
                  </div>
                </div>
              )}

              {publishMutation.isPending && (
                <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground">
                  <Spinner className="size-4 text-primary" />
                  <span>Compiling components with tsup and generating packages...</span>
                </div>
              )}

              {publishMutation.isError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive flex gap-2">
                  <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Publishing / Compilation Failed</p>
                    <pre className="text-[10px] whitespace-pre-wrap max-h-40 overflow-y-auto font-mono bg-destructive/10 p-1.5 rounded border border-destructive/15">
                      {publishMutation.error instanceof Error
                        ? publishMutation.error.message
                        : "Failed to publish design system."}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogPanel>

        <DialogFooter>
          {!publishResult && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={publishMutation.isPending}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={
              publishMutation.isPending ||
              (!publishResult && !version.trim()) ||
              (!publishResult &&
                publishMode !== "local" &&
                (!registryUrl.trim() || !authToken.trim()))
            }
          >
            {publishMutation.isPending ? (
              <span className="flex items-center gap-1.5">
                <Spinner className="size-3.5" />
                Publishing...
              </span>
            ) : publishResult ? (
              "Done"
            ) : (
              "Publish & Build"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
