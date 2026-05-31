"use client";

import type {
  AutoDsmBrandToken,
  AutoDsmBrandTokenCategory,
  AutoDsmBrandTokenDraft,
  AutoDsmBrandTokenPatch,
} from "@t3tools/contracts";
import { Trash2Icon } from "lucide-react";
import { useEffect, useState, type JSX } from "react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  buildTokenDraft,
  DESIGN_TOKEN_CATEGORY_LABEL,
  EMPTY_TOKEN_DRAFT_FIELDS,
  tokenFieldsFromToken,
  type TokenDraftFields,
} from "~/lib/designTokenGroups";

export type EditDesignTokenDialogMode = "add" | "edit";

export interface EditDesignTokenDialogProps {
  readonly open: boolean;
  readonly mode: EditDesignTokenDialogMode;
  readonly category: AutoDsmBrandTokenCategory;
  readonly token: AutoDsmBrandToken | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onAdd: (draft: AutoDsmBrandTokenDraft) => Promise<void>;
  readonly onUpdate: (tokenId: string, patch: AutoDsmBrandTokenPatch) => Promise<void>;
  readonly onRemove?: (tokenId: string) => void;
  readonly addPending?: boolean;
  readonly updatePending?: boolean;
  readonly removePending?: boolean;
}

function draftToPatch(draft: AutoDsmBrandTokenDraft): AutoDsmBrandTokenPatch {
  return {
    name: draft.name,
    value: draft.value,
    ...(draft.color !== undefined ? { color: draft.color } : {}),
    ...(draft.typography !== undefined ? { typography: draft.typography } : {}),
  };
}

export function EditDesignTokenDialog({
  open,
  mode,
  category,
  token,
  onOpenChange,
  onAdd,
  onUpdate,
  onRemove,
  addPending = false,
  updatePending = false,
  removePending = false,
}: EditDesignTokenDialogProps): JSX.Element {
  const [fields, setFields] = useState<TokenDraftFields>(EMPTY_TOKEN_DRAFT_FIELDS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === "edit" && token) {
      setFields(tokenFieldsFromToken(token));
    } else {
      setFields(EMPTY_TOKEN_DRAFT_FIELDS);
    }
    setError(null);
  }, [open, mode, token]);

  const setField = (key: keyof TokenDraftFields, value: string): void => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const pending = addPending || updatePending || removePending;

  const handleSave = async (): Promise<void> => {
    const result = buildTokenDraft(category, fields);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    try {
      if (mode === "add") {
        await onAdd(result.draft);
      } else if (token) {
        await onUpdate(token.id, draftToPatch(result.draft));
      }
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to save token.");
    }
  };

  const title =
    mode === "add"
      ? `Add ${DESIGN_TOKEN_CATEGORY_LABEL[category].toLowerCase()} token`
      : `Edit ${DESIGN_TOKEN_CATEGORY_LABEL[category].toLowerCase()} token`;

  const draftInput = (
    key: keyof TokenDraftFields,
    placeholder: string,
    label: string,
  ): JSX.Element => (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Input
        value={fields[key]}
        placeholder={placeholder}
        disabled={pending}
        onChange={(event) => {
          setField(key, event.target.value);
        }}
      />
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "add" ? "Create a new design token" : "Update design token values"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 pb-5">
          {draftInput("name", "token-name", "Name")}
          {category === "color" ? (
            <>
              {draftInput("light", "#000000 / oklch(…)", "Light")}
              {draftInput("dark", "optional dark value", "Dark")}
            </>
          ) : null}
          {category === "typography" ? (
            <>
              {draftInput("fontFamily", "Manrope", "Font family")}
              {draftInput("fontSize", "16px", "Size")}
              {draftInput("letterSpacing", "0", "Letter spacing")}
            </>
          ) : null}
          {category !== "color" && category !== "typography" && category !== "icon"
            ? draftInput("value", "value", "Value")
            : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {mode === "edit" && token && onRemove ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={pending}
                onClick={() => {
                  onRemove(token.id);
                  onOpenChange(false);
                }}
              >
                <Trash2Icon />
                Remove
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <DialogClose render={<Button variant="outline" size="sm" disabled={pending} />}>
                Cancel
              </DialogClose>
              <Button size="sm" disabled={pending} onClick={handleSave}>
                {mode === "add" ? "Add token" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  );
}
