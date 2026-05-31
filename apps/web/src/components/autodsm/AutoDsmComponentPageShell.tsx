"use client";

import type { EnvironmentId } from "@t3tools/contracts";
import type { JSX, ReactNode } from "react";

import { AutoDsmComponentAgentRailHeader } from "~/components/autodsm/AutoDsmComponentAgentRailHeader";
import { AutoDsmComponentPreviewCanvas } from "~/components/autodsm/AutoDsmComponentPreviewCanvas";
import { cn } from "~/lib/utils";

export interface AutoDsmComponentPageShellProps {
  readonly relativePath: string;
  readonly environmentId: EnvironmentId;
  readonly workspaceCwd: string | null;
  readonly componentTitle: string;
  /**
   * Named export within `relativePath` this page is centered on. Passed
   * through to the preview canvas so variant agents render their actual
   * variant. Omitted for single-export wrappers (file's first export).
   */
  readonly exportName?: string;
  readonly registerPromptAppendix?: (getter: () => string | null) => void;
  readonly onInjectComposerText?: (text: string) => void;
  readonly agentRail: ReactNode;
  readonly className?: string;
}

/**
 * Figma-aligned Component Page center column (toolbar + centered preview) plus right agent rail slot.
 */
export function AutoDsmComponentPageShell(props: AutoDsmComponentPageShellProps): JSX.Element {
  const {
    relativePath,
    environmentId,
    workspaceCwd,
    componentTitle,
    exportName,
    registerPromptAppendix,
    onInjectComposerText,
    agentRail,
    className,
  } = props;

  return (
    <div
      className={cn("grid min-h-0 min-w-0 flex-1 overflow-hidden", className)}
      data-testid="autodsm-component-page-shell"
      style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 20rem)" }}
    >
      <AutoDsmComponentPreviewCanvas
        relativePath={relativePath}
        environmentId={environmentId}
        workspaceCwd={workspaceCwd}
        {...(exportName ? { exportName } : {})}
        {...(registerPromptAppendix ? { registerPromptAppendix } : {})}
        {...(onInjectComposerText ? { onInjectComposerText } : {})}
      />
      <div className="flex min-h-0 min-w-0 flex-col border-l border-border bg-background">
        {workspaceCwd ? (
          <AutoDsmComponentAgentRailHeader
            environmentId={environmentId}
            cwd={workspaceCwd}
            componentTitle={componentTitle}
          />
        ) : null}
        {agentRail}
      </div>
    </div>
  );
}
