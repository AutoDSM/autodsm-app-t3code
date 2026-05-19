import {
  type EnvironmentId,
  type EditorId,
  type ProjectScript,
  type ResolvedKeybindingsConfig,
  type ThreadId,
} from "@t3tools/contracts";
import { scopeThreadRef } from "@t3tools/client-runtime";
import { memo } from "react";
import GitActionsControl from "../GitActionsControl";
import { type DraftId } from "~/composerDraftStore";
import { DiffIcon, MoreHorizontalIcon, TerminalSquareIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import ProjectScriptsControl, { type NewProjectScriptInput } from "../ProjectScriptsControl";
import { Toggle } from "../ui/toggle";
import { SidebarTrigger } from "../ui/sidebar";
import { OpenInPicker } from "./OpenInPicker";
import { usePrimaryEnvironmentId } from "../../environments/primary";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";

/** Container width (~35rem): below this we collapse header actions behind a ⋯ menu. */
const CHAT_HEADER_ACTIONS_EXPAND_MIN = "@min-[35rem]/header-actions";

interface ChatHeaderProps {
  activeThreadEnvironmentId: EnvironmentId;
  activeThreadId: ThreadId;
  draftId?: DraftId;
  activeThreadTitle: string;
  activeProjectName: string | undefined;
  isGitRepo: boolean;
  openInCwd: string | null;
  activeProjectScripts: ProjectScript[] | undefined;
  preferredScriptId: string | null;
  keybindings: ResolvedKeybindingsConfig;
  availableEditors: ReadonlyArray<EditorId>;
  terminalAvailable: boolean;
  terminalOpen: boolean;
  terminalToggleShortcutLabel: string | null;
  diffToggleShortcutLabel: string | null;
  gitCwd: string | null;
  diffOpen: boolean;
  onRunProjectScript: (script: ProjectScript) => void;
  onAddProjectScript: (input: NewProjectScriptInput) => Promise<void>;
  onUpdateProjectScript: (scriptId: string, input: NewProjectScriptInput) => Promise<void>;
  onDeleteProjectScript: (scriptId: string) => Promise<void>;
  onToggleTerminal: () => void;
  onToggleDiff: () => void;
  /** AutoDSM product mode: thread title only, hide noisy project badge. */
  productMode?: boolean;
}

type ChatHeaderSecondaryActionsProps = {
  readonly orientation: "row" | "column";
  readonly showOpenInPicker: boolean;
  readonly activeThreadEnvironmentId: EnvironmentId;
  readonly activeThreadId: ThreadId;
  readonly draftId?: DraftId;
  readonly activeProjectName: string | undefined;
  readonly isGitRepo: boolean;
  readonly openInCwd: string | null;
  readonly activeProjectScripts: ProjectScript[] | undefined;
  readonly preferredScriptId: string | null;
  readonly keybindings: ResolvedKeybindingsConfig;
  readonly availableEditors: ReadonlyArray<EditorId>;
  readonly terminalAvailable: boolean;
  readonly terminalOpen: boolean;
  readonly terminalToggleShortcutLabel: string | null;
  readonly diffToggleShortcutLabel: string | null;
  readonly gitCwd: string | null;
  readonly diffOpen: boolean;
  readonly onRunProjectScript: ChatHeaderProps["onRunProjectScript"];
  readonly onAddProjectScript: ChatHeaderProps["onAddProjectScript"];
  readonly onUpdateProjectScript: ChatHeaderProps["onUpdateProjectScript"];
  readonly onDeleteProjectScript: ChatHeaderProps["onDeleteProjectScript"];
  readonly onToggleTerminal: ChatHeaderProps["onToggleTerminal"];
  readonly onToggleDiff: ChatHeaderProps["onToggleDiff"];
};

const ChatHeaderSecondaryActions = memo(function ChatHeaderSecondaryActions({
  orientation,
  showOpenInPicker,
  activeThreadEnvironmentId,
  activeThreadId,
  draftId,
  activeProjectName,
  isGitRepo,
  openInCwd,
  activeProjectScripts,
  preferredScriptId,
  keybindings,
  availableEditors,
  terminalAvailable,
  terminalOpen,
  terminalToggleShortcutLabel,
  diffToggleShortcutLabel,
  gitCwd,
  diffOpen,
  onRunProjectScript,
  onAddProjectScript,
  onUpdateProjectScript,
  onDeleteProjectScript,
  onToggleTerminal,
  onToggleDiff,
}: ChatHeaderSecondaryActionsProps) {
  const horizontal = orientation === "row";

  const primaryToggleBlock = (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              className={cn(
                !horizontal &&
                  "h-auto min-h-9 w-full justify-start px-3 py-2 whitespace-normal shadow-xs/5",
              )}
              pressed={terminalOpen}
              onPressedChange={onToggleTerminal}
              aria-label="Toggle terminal drawer"
              variant="outline"
              size="xs"
              disabled={!terminalAvailable}
            >
              <TerminalSquareIcon className="size-3 shrink-0" />
              {!horizontal ? (
                <span className="ms-2 min-w-0 truncate text-xs font-normal">
                  {terminalToggleShortcutLabel
                    ? `Terminal (${terminalToggleShortcutLabel})`
                    : "Terminal"}
                </span>
              ) : null}
            </Toggle>
          }
        />
        <TooltipPopup side="bottom">
          {!terminalAvailable
            ? "Terminal is unavailable until this thread has an active project."
            : terminalToggleShortcutLabel
              ? `Toggle terminal drawer (${terminalToggleShortcutLabel})`
              : "Toggle terminal drawer"}
        </TooltipPopup>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              className={cn(
                !horizontal &&
                  "h-auto min-h-9 w-full justify-start px-3 py-2 whitespace-normal shadow-xs/5",
              )}
              pressed={diffOpen}
              onPressedChange={onToggleDiff}
              aria-label="Toggle diff panel"
              variant="outline"
              size="xs"
              disabled={!isGitRepo && !diffOpen}
            >
              <DiffIcon className="size-3 shrink-0" />
              {!horizontal ? (
                <span className="ms-2 min-w-0 truncate text-xs font-normal">
                  {diffToggleShortcutLabel ? `Diff (${diffToggleShortcutLabel})` : "Diff"}
                </span>
              ) : null}
            </Toggle>
          }
        />
        <TooltipPopup side="bottom">
          {!isGitRepo && !diffOpen
            ? "Diff panel is unavailable because this project is not a git repository."
            : diffToggleShortcutLabel
              ? `Toggle diff panel (${diffToggleShortcutLabel})`
              : "Toggle diff panel"}
        </TooltipPopup>
      </Tooltip>
    </>
  );

  const actions = (
    <>
      {activeProjectScripts && (
        <ProjectScriptsControl
          scripts={activeProjectScripts}
          keybindings={keybindings}
          preferredScriptId={preferredScriptId}
          toolbarStack={!horizontal}
          onRunScript={onRunProjectScript}
          onAddScript={onAddProjectScript}
          onUpdateScript={onUpdateProjectScript}
          onDeleteScript={onDeleteProjectScript}
        />
      )}
      {showOpenInPicker ? (
        <OpenInPicker
          keybindings={keybindings}
          availableEditors={availableEditors}
          openInCwd={openInCwd}
          toolbarStack={!horizontal}
        />
      ) : null}
      {activeProjectName ? (
        <GitActionsControl
          gitCwd={gitCwd}
          activeThreadRef={scopeThreadRef(activeThreadEnvironmentId, activeThreadId)}
          toolbarStack={!horizontal}
          {...(draftId ? { draftId } : {})}
        />
      ) : null}

      {horizontal ? (
        primaryToggleBlock
      ) : (
        <div className="flex w-full min-w-0 flex-col gap-2">{primaryToggleBlock}</div>
      )}
    </>
  );

  return horizontal ? (
    <div className="flex shrink-0 flex-row flex-nowrap items-center justify-end gap-2 @3xl/header-actions:gap-3">
      {actions}
    </div>
  ) : (
    <div className="flex min-w-60 max-w-none flex-col items-stretch gap-2">{actions}</div>
  );
});

export function shouldShowOpenInPicker(input: {
  readonly activeProjectName: string | undefined;
  readonly activeThreadEnvironmentId: EnvironmentId;
  readonly primaryEnvironmentId: EnvironmentId | null;
}): boolean {
  return (
    Boolean(input.activeProjectName) &&
    input.primaryEnvironmentId !== null &&
    input.activeThreadEnvironmentId === input.primaryEnvironmentId
  );
}

export const ChatHeader = memo(function ChatHeader({
  activeThreadEnvironmentId,
  activeThreadId,
  draftId,
  activeThreadTitle,
  activeProjectName,
  isGitRepo,
  openInCwd,
  activeProjectScripts,
  preferredScriptId,
  keybindings,
  availableEditors,
  terminalAvailable,
  terminalOpen,
  terminalToggleShortcutLabel,
  diffToggleShortcutLabel,
  gitCwd,
  diffOpen,
  onRunProjectScript,
  onAddProjectScript,
  onUpdateProjectScript,
  onDeleteProjectScript,
  onToggleTerminal,
  onToggleDiff,
  productMode = false,
}: ChatHeaderProps) {
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const showOpenInPicker = shouldShowOpenInPicker({
    activeProjectName,
    activeThreadEnvironmentId,
    primaryEnvironmentId,
  });

  const secondaryProps = {
    showOpenInPicker,
    activeThreadEnvironmentId,
    activeThreadId,
    ...(draftId ? { draftId } : {}),
    activeProjectName,
    isGitRepo,
    openInCwd,
    activeProjectScripts,
    preferredScriptId,
    keybindings,
    availableEditors,
    terminalAvailable,
    terminalOpen,
    terminalToggleShortcutLabel,
    diffToggleShortcutLabel,
    gitCwd,
    diffOpen,
    onRunProjectScript,
    onAddProjectScript,
    onUpdateProjectScript,
    onDeleteProjectScript,
    onToggleTerminal,
    onToggleDiff,
  } satisfies Omit<ChatHeaderSecondaryActionsProps, "orientation">;

  return (
    <div className="@container/header-actions flex min-w-0 flex-1 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-3">
        <SidebarTrigger className="size-7 shrink-0 md:hidden" />
        <h2
          className="min-w-0 shrink truncate text-sm font-medium text-foreground"
          title={activeThreadTitle}
        >
          {activeThreadTitle}
        </h2>
        {activeProjectName && !productMode ? (
          <Badge variant="outline" className="min-w-0 shrink overflow-hidden">
            <span className="min-w-0 truncate">{activeProjectName}</span>
          </Badge>
        ) : null}
        {activeProjectName && !isGitRepo && !productMode ? (
          <Badge variant="outline" className="shrink-0 text-[10px] text-amber-700">
            No Git
          </Badge>
        ) : null}
      </div>

      {/* Wide header: actions inline */}
      <div
        className={cn("hidden shrink-0", CHAT_HEADER_ACTIONS_EXPAND_MIN, "flex-row flex-nowrap")}
      >
        <ChatHeaderSecondaryActions orientation="row" {...secondaryProps} />
      </div>

      {/* Narrow header: collapsed ⋯ */}
      <div className={cn("flex shrink-0", `${CHAT_HEADER_ACTIONS_EXPAND_MIN}:hidden`)}>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon-xs"
                className="shrink-0"
                aria-haspopup="dialog"
                aria-label="Chat actions"
              >
                <MoreHorizontalIcon className="size-4" />
              </Button>
            }
          />
          <PopoverPopup
            align="end"
            side="bottom"
            sideOffset={4}
            className="max-w-none [--viewport-inline-padding:--spacing(2)]"
          >
            <ChatHeaderSecondaryActions orientation="column" {...secondaryProps} />
          </PopoverPopup>
        </Popover>
      </div>
    </div>
  );
});
