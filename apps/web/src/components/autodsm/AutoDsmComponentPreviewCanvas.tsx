"use client";

import type { ComponentPreviewManifest, EnvironmentId } from "@t3tools/contracts";
import { useEffect, useState, type JSX } from "react";

import {
  AutoDsmComponentPageToolbar,
  type AutoDsmComponentPageToolbarTab,
} from "~/components/autodsm/AutoDsmComponentPageToolbar";
import { AutoDsmComponentCodeView } from "~/components/autodsm/AutoDsmComponentCodeView";
import { AutoDsmComponentVariantsGrid } from "~/components/autodsm/AutoDsmComponentVariantsGrid";
import { WebContentsView } from "~/components/WebContentsView";
import { hasMultipleVariants, hasPropVariants } from "~/lib/autoDsmComponentVariantFamily";
import { cn } from "~/lib/utils";

export interface AutoDsmComponentPreviewCanvasProps {
  readonly relativePath: string;
  readonly environmentId: EnvironmentId;
  readonly workspaceCwd: string | null;
  /**
   * Component-preview manifest + controlled prop values, owned by the parent
   * (`useAutoDsmComponentPreviewState`) so the right-column Props tab and this
   * preview share a single source of truth.
   */
  readonly manifest: ComponentPreviewManifest | undefined;
  readonly primaryExportName: string;
  readonly controlledProps: Record<string, unknown>;
  /**
   * Legacy agent export hint — ignored for Demo tab rendering; primary export
   * from analysis is always used so variant props are pickable in one place.
   */
  readonly exportName?: string;
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
    manifest,
    primaryExportName,
    controlledProps,
    registerPromptAppendix,
    onInjectComposerText,
    className,
  } = props;

  const [activeTab, setActiveTab] = useState<AutoDsmComponentPageToolbarTab>("demo");

  useEffect(() => {
    if (!manifest || !hasMultipleVariants(manifest)) {
      setActiveTab("demo");
    }
  }, [manifest, relativePath]);

  const variantsEnabled = manifest
    ? hasPropVariants(manifest, primaryExportName) || hasMultipleVariants(manifest)
    : false;

  return (
    <div
      className={cn("flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}
      data-testid="autodsm-component-preview-canvas"
    >
      <AutoDsmComponentPageToolbar
        activeTab={activeTab}
        variantsEnabled={variantsEnabled}
        onTabChange={setActiveTab}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {activeTab === "demo" ? (
            <WebContentsView
              key={`${relativePath}::${primaryExportName}`}
              relativePath={relativePath}
              environmentId={environmentId}
              workspaceCwd={workspaceCwd}
              variant="product"
              initialExportName={primaryExportName}
              controlledProps={controlledProps}
              {...(registerPromptAppendix ? { registerPromptAppendix } : {})}
              {...(onInjectComposerText ? { onInjectComposerText } : {})}
            />
          ) : activeTab === "code" ? (
            workspaceCwd ? (
              <AutoDsmComponentCodeView
                relativePath={relativePath}
                environmentId={environmentId}
                workspaceCwd={workspaceCwd}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-muted-foreground text-xs">
                Loading source…
              </div>
            )
          ) : activeTab === "variants" ? (
            manifest && workspaceCwd ? (
              <AutoDsmComponentVariantsGrid
                relativePath={relativePath}
                environmentId={environmentId}
                workspaceCwd={workspaceCwd}
                manifest={manifest}
                exportName={primaryExportName}
                baseProps={controlledProps}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-muted-foreground text-xs">
                Loading variants…
              </div>
            )
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-xs">
              Coming soon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
