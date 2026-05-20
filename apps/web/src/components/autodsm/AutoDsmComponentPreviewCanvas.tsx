"use client";

import type { EnvironmentId } from "@t3tools/contracts";
import type { JSX } from "react";

import { AutoDsmComponentPageToolbar } from "~/components/autodsm/AutoDsmComponentPageToolbar";
import { WebContentsView } from "~/components/WebContentsView";
import { cn } from "~/lib/utils";

export interface AutoDsmComponentPreviewCanvasProps {
  readonly relativePath: string;
  readonly environmentId: EnvironmentId;
  readonly workspaceCwd: string | null;
  readonly registerPromptAppendix?: (getter: () => string | null) => void;
  readonly onInjectComposerText?: (text: string) => void;
  readonly className?: string;
}

export function AutoDsmComponentPreviewCanvas(
  props: AutoDsmComponentPreviewCanvasProps,
): JSX.Element {
  const {
    relativePath,
    environmentId,
    workspaceCwd,
    registerPromptAppendix,
    onInjectComposerText,
    className,
  } = props;

  return (
    <div
      className={cn("flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}
      data-testid="autodsm-component-preview-canvas"
    >
      <AutoDsmComponentPageToolbar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#1b1b1b] p-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/40 bg-[#1b1b1b] shadow-lg">
          <WebContentsView
            key={relativePath}
            relativePath={relativePath}
            environmentId={environmentId}
            workspaceCwd={workspaceCwd}
            variant="product"
            {...(registerPromptAppendix ? { registerPromptAppendix } : {})}
            {...(onInjectComposerText ? { onInjectComposerText } : {})}
          />
        </div>
      </div>
    </div>
  );
}
