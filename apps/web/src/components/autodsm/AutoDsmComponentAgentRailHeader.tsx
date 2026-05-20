"use client";

import type { EnvironmentId } from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { AutoDsmPullRequestDialog } from "~/components/autodsm/AutoDsmPullRequestDialog";
import { Button } from "~/components/ui/button";
import { autodsmComponentAgentsQueryOptions } from "~/lib/autodsmWorkspaceReactQuery";
import { cn } from "~/lib/utils";

export interface AutoDsmComponentAgentRailHeaderProps {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly componentTitle: string;
  readonly addedLines?: number;
  readonly removedLines?: number;
  readonly className?: string;
}

export function AutoDsmComponentAgentRailHeader(props: AutoDsmComponentAgentRailHeaderProps) {
  const { environmentId, cwd, componentTitle, addedLines = 0, removedLines = 0, className } = props;
  const [pullRequestOpen, setPullRequestOpen] = useState(false);

  const agentsQuery = useQuery(
    autodsmComponentAgentsQueryOptions({ environmentId, cwd, enabled: true }),
  );

  const activeAgentTitle = useMemo(() => {
    const agents = agentsQuery.data?.manifest.agents ?? [];
    const match = agents.find(
      (agent) =>
        agent.title.localeCompare(componentTitle, undefined, { sensitivity: "base" }) === 0,
    );
    return match?.title ?? componentTitle;
  }, [agentsQuery.data?.manifest.agents, componentTitle]);

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 sm:px-4",
          className,
        )}
        data-testid="autodsm-component-agent-rail-header"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{activeAgentTitle}</p>
          <p className="text-[11px] text-muted-foreground">
            <span className="text-emerald-500">+{addedLines}</span>
            {" / "}
            <span className="text-rose-500">−{removedLines}</span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => {
            setPullRequestOpen(true);
          }}
        >
          Create PR
        </Button>
      </div>
      <AutoDsmPullRequestDialog
        open={pullRequestOpen}
        onOpenChange={setPullRequestOpen}
        environmentId={environmentId}
        cwd={cwd}
      />
    </>
  );
}
