"use client";

import type {
  AutoDsmBrandProfile,
  AutoDsmComponentRegistry,
  AutoDsmProjectProfile,
} from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { readEnvironmentApi } from "~/environmentApi";
import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";

function statusLabel(status: AutoDsmProjectProfile["status"]): string {
  return status;
}

export function AutoDsmIndexingSummary(props: {
  readonly variant?: "default" | "onDark";
}): JSX.Element | null {
  const { variant = "default" } = props;
  const onDark = variant === "onDark";
  const { cwd, environmentId, projectName } = useAutoDsmWorkspace();

  const summaryQuery = useQuery({
    queryKey: ["autodsm-home-index-summary", environmentId, cwd],
    enabled: Boolean(cwd && environmentId),
    queryFn: async (): Promise<{
      projectProfile: AutoDsmProjectProfile;
      brandProfile: AutoDsmBrandProfile;
      registry: AutoDsmComponentRegistry;
    }> => {
      const api = readEnvironmentApi(environmentId!);
      if (!api || !cwd) {
        throw new Error("Workspace unavailable.");
      }
      const [projectProfile, brandProfile, registry] = await Promise.all([
        api.autodsm.getProjectProfile({ cwd }),
        api.autodsm.getBrandProfile({ cwd }),
        api.autodsm.getComponentRegistry({ cwd }),
      ]);
      return { projectProfile, brandProfile, registry };
    },
  });

  if (!cwd || !environmentId) {
    return null;
  }

  const data = summaryQuery.data;

  return (
    <div
      className={
        onDark
          ? "rounded-2xl border border-border/60 bg-card/65 px-5 py-4"
          : "mt-10 rounded-2xl border border-border/55 bg-muted/10 px-5 py-4"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active workspace
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{projectName ?? cwd}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{cwd}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
            to="/design-components"
          >
            Components
          </Link>
          <Link
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
            to="/design-tokens"
          >
            Design tokens
          </Link>
        </div>
      </div>

      {summaryQuery.isPending ? (
        <p className="mt-4 text-xs text-muted-foreground">Loading indexer status…</p>
      ) : null}

      {summaryQuery.isError ? (
        <p className={onDark ? "mt-4 text-xs text-red-400" : "mt-4 text-xs text-destructive"}>
          Unable to read AutoDSM artifacts. Reconnect and try again.
        </p>
      ) : null}

      {data ? (
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
            <dt className="text-muted-foreground">Project profile</dt>
            <dd className="mt-1 font-medium text-foreground">
              {statusLabel(data.projectProfile.status)}
            </dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
            <dt className="text-muted-foreground">Brand profile</dt>
            <dd className="mt-1 font-medium text-foreground">
              {statusLabel(data.brandProfile.status)}
            </dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
            <dt className="text-muted-foreground">Component registry</dt>
            <dd className="mt-1 font-medium text-foreground">
              {statusLabel(data.registry.status)} · {data.registry.entries.length} entries
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
