"use client";

import { useCallback, useState } from "react";

import { Button } from "../../ui/button";

import { SingleProjectTestPanel } from "./SingleProjectTestPanel";

/** TEMPORARY: dev-only UI; delete with `_temp-testing` when no longer needed. */
export function TempTestingSingleProjectHarness() {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  return (
    <div className="pointer-events-auto fixed right-4 bottom-4 z-[100] flex max-w-sm flex-col gap-2 rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
      <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        Temp testing
      </p>
      <Button type="button" variant="outline" size="sm" onClick={toggle}>
        {open ? "Hide" : "Show"} project panel
      </Button>
      {open ? <SingleProjectTestPanel /> : null}
    </div>
  );
}
