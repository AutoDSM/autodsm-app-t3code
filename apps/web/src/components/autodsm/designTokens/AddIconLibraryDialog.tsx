"use client";

import type { AutoDsmIconLibraryId } from "@t3tools/contracts";
import type { JSX } from "react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

const LIBRARY_OPTIONS: readonly {
  readonly id: AutoDsmIconLibraryId;
  readonly label: string;
  readonly description: string;
}[] = [
  { id: "lucide", label: "Lucide", description: "Default shadcn icon set" },
  { id: "heroicons", label: "Heroicons", description: "Tailwind UI icon family" },
  { id: "phosphor", label: "Phosphor", description: "Flexible weight icons" },
  { id: "radix", label: "Radix Icons", description: "Radix UI primitives" },
];

export interface AddIconLibraryDialogProps {
  readonly open: boolean;
  readonly pending: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelect: (library: AutoDsmIconLibraryId) => void;
}

export function AddIconLibraryDialog({
  open,
  pending,
  onOpenChange,
  onSelect,
}: AddIconLibraryDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-lg">
        <DialogTitle>Add an icon library</DialogTitle>
        <DialogDescription className="px-5 text-sm text-muted-foreground">
          Install an icon package in your workspace and sync the library into your design tokens.
        </DialogDescription>
        <div className="grid gap-2 px-5 pb-5">
          {LIBRARY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={pending}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-left transition-colors",
                "hover:border-border hover:bg-muted/30 disabled:opacity-50",
              )}
              onClick={() => {
                onSelect(option.id);
              }}
            >
              <span className="text-sm font-medium text-foreground">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </button>
          ))}
          <DialogClose render={<Button variant="outline" size="sm" className="mt-2 w-full" />}>
            Cancel
          </DialogClose>
        </div>
      </DialogPopup>
    </Dialog>
  );
}
