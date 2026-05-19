"use client";

import { FolderInputIcon, FolderOpenIcon } from "lucide-react";
import type { JSX } from "react";

import { AutoDsmDesignSystemHistoryList } from "~/components/autodsm/AutoDsmDesignSystemHistoryList";
import type { UseAutoDsmLaunchActionsResult } from "~/hooks/useAutoDsmLaunchActions";
import { useOpenAutoDsmDesignSystemHistory } from "~/hooks/useOpenAutoDsmDesignSystemHistory";
import { usePrimaryAutoDsmDesignSystemHistory } from "~/hooks/useAutoDsmDesignSystemHistory";
import { cn } from "~/lib/utils";

import { AutoDsmLogoMark } from "./AutoDsmLogoMark";

const TILE_BG = "border border-border/60 bg-card/65";

export function AutoDsmFigmaLaunchScreen(props: {
  readonly launch: UseAutoDsmLaunchActionsResult;
}): JSX.Element {
  const { openLocalProject, cloneRepository, pickDisabled, cloneDisabled, isPickingFolder } =
    props.launch;
  const history = usePrimaryAutoDsmDesignSystemHistory();
  const { openEntry, isOpening } = useOpenAutoDsmDesignSystemHistory();

  return (
    <div className="flex w-full max-w-[480px] flex-col gap-6">
      <div className="flex items-center gap-3">
        <AutoDsmLogoMark className="size-10 shrink-0 sm:size-11" />
        <p className="text-[1.65rem] leading-none font-extrabold tracking-tight text-foreground sm:text-[1.75rem]">
          autoDSM
        </p>
      </div>

      <div className="flex w-full gap-4">
        <LaunchTile
          disabled={pickDisabled}
          icon={
            <FolderOpenIcon aria-hidden className="size-6 text-foreground" strokeWidth={1.75} />
          }
          label={isPickingFolder ? "Opening…" : "Open folder"}
          onActivate={() => {
            void openLocalProject();
          }}
        />
        <LaunchTile
          disabled={cloneDisabled}
          icon={
            <FolderInputIcon aria-hidden className="size-6 text-foreground" strokeWidth={1.75} />
          }
          label="Clone repo"
          onActivate={cloneRepository}
        />
      </div>

      <AutoDsmDesignSystemHistoryList
        entries={history.rows}
        isError={history.isError}
        isLoading={history.isLoading}
        disabled={isOpening || pickDisabled}
        onSelect={(entry) => {
          void openEntry(entry);
        }}
      />
    </div>
  );
}

function LaunchTile(props: {
  readonly disabled: boolean;
  readonly icon: JSX.Element;
  readonly label: string;
  readonly onActivate: () => void;
}) {
  const { disabled, icon, label, onActivate } = props;

  return (
    <button
      className={cn(
        TILE_BG,
        "flex min-h-[112px] flex-1 flex-col items-start justify-center gap-2 rounded-2xl p-4 text-left outline-none transition-colors",
        disabled
          ? "cursor-not-allowed opacity-45"
          : "cursor-pointer hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      disabled={disabled}
      onClick={onActivate}
      type="button"
    >
      <span className="flex size-6 shrink-0 items-center justify-center">{icon}</span>
      <span className="font-bold text-[18px] leading-tight text-foreground">{label}</span>
    </button>
  );
}
