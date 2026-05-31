import type { JSX } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export interface ShadcnResizableProps {
  readonly direction?: "horizontal" | "vertical";
}

export function ShadcnResizable(props: ShadcnResizableProps): JSX.Element {
  const direction = props.direction ?? "horizontal";
  return (
    <div className="h-48 w-full overflow-hidden rounded-md border border-[var(--border)]">
      <PanelGroup direction={direction} className="h-full w-full">
        <Panel defaultSize={40} minSize={20}>
          <div className="flex h-full items-center justify-center bg-[var(--muted)] p-4 text-sm text-[var(--foreground)]">
            One
          </div>
        </Panel>
        <PanelResizeHandle
          className={
            direction === "horizontal"
              ? "w-1 bg-[var(--border)] hover:bg-[var(--primary)]"
              : "h-1 bg-[var(--border)] hover:bg-[var(--primary)]"
          }
        />
        <Panel defaultSize={60} minSize={20}>
          <PanelGroup direction={direction === "horizontal" ? "vertical" : "horizontal"}>
            <Panel defaultSize={50} minSize={20}>
              <div className="flex h-full items-center justify-center bg-[var(--background)] p-4 text-sm text-[var(--foreground)]">
                Two
              </div>
            </Panel>
            <PanelResizeHandle
              className={
                direction === "horizontal"
                  ? "h-1 bg-[var(--border)] hover:bg-[var(--primary)]"
                  : "w-1 bg-[var(--border)] hover:bg-[var(--primary)]"
              }
            />
            <Panel defaultSize={50} minSize={20}>
              <div className="flex h-full items-center justify-center bg-[var(--background)] p-4 text-sm text-[var(--foreground)]">
                Three
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
