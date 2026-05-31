import type { JSX } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export interface TwResizableProps {
  readonly label?: string;
}

export function TwResizable(_props: TwResizableProps = {}): JSX.Element {
  return (
    <div className="h-48 w-full max-w-lg overflow-hidden rounded-lg border border-[var(--border)]">
      <PanelGroup direction="horizontal">
        <Panel
          defaultSize={30}
          minSize={15}
          className="flex items-center justify-center bg-[var(--muted)] text-sm text-[var(--foreground)]"
        >
          One
        </Panel>
        <PanelResizeHandle className="w-1 bg-[var(--border)] hover:bg-[var(--primary,#4f46e5)]" />
        <Panel
          defaultSize={40}
          minSize={15}
          className="flex items-center justify-center bg-[var(--background)] text-sm text-[var(--foreground)]"
        >
          Two
        </Panel>
        <PanelResizeHandle className="w-1 bg-[var(--border)] hover:bg-[var(--primary,#4f46e5)]" />
        <Panel
          defaultSize={30}
          minSize={15}
          className="flex items-center justify-center bg-[var(--muted)] text-sm text-[var(--foreground)]"
        >
          Three
        </Panel>
      </PanelGroup>
    </div>
  );
}
