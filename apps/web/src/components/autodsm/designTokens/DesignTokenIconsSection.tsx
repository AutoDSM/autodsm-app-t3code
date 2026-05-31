"use client";

import type { AutoDsmBrandToken, AutoDsmIconLibraryId } from "@t3tools/contracts";
import { PlusIcon, SearchIcon } from "lucide-react";
import { useMemo, useState, type JSX } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Toggle, ToggleGroup } from "~/components/ui/toggle-group";
import { listLucideIconCatalog } from "~/lib/lucideIconCatalog";
import { cn } from "~/lib/utils";

import { AddIconLibraryDialog } from "./AddIconLibraryDialog";

const ICON_SIZES = [16, 20, 24, 32] as const;

export interface DesignTokenIconsSectionProps {
  readonly iconLibraryToken: AutoDsmBrandToken | null;
  readonly installPending: boolean;
  readonly onInstallLibrary: (library: AutoDsmIconLibraryId) => void;
}

function hasIconLibrary(token: AutoDsmBrandToken | null): boolean {
  return token !== null && token.value.trim().length > 0;
}

export function DesignTokenIconsSection({
  iconLibraryToken,
  installPending,
  onInstallLibrary,
}: DesignTokenIconsSectionProps): JSX.Element {
  const [search, setSearch] = useState("");
  const [size, setSize] = useState<(typeof ICON_SIZES)[number]>(24);
  const [addLibraryOpen, setAddLibraryOpen] = useState(false);

  const installedLibrary = iconLibraryToken?.value.trim().toLowerCase() ?? "";
  const libraryReady = hasIconLibrary(iconLibraryToken);
  const showLucidePreviewNote =
    libraryReady && installedLibrary.length > 0 && installedLibrary !== "lucide";

  const catalog = useMemo(() => listLucideIconCatalog(), []);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length === 0) {
      return catalog;
    }
    return catalog.filter((entry) => entry.id.includes(query));
  }, [catalog, search]);

  if (!libraryReady) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-muted/5 px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No icon library is configured for this workspace yet.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setAddLibraryOpen(true);
            }}
          >
            <PlusIcon />
            Add an icon library
          </Button>
        </div>
        <AddIconLibraryDialog
          open={addLibraryOpen}
          pending={installPending}
          onOpenChange={setAddLibraryOpen}
          onSelect={(library) => {
            onInstallLibrary(library);
            setAddLibraryOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {showLucidePreviewNote ? (
        <p className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Library installed —{" "}
          <span className="font-medium text-foreground">{installedLibrary}</span>. Lucide preview
          shown until additional icon packages are bundled in the web app.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search icons…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
        </div>
        <ToggleGroup
          value={[String(size)]}
          onValueChange={(value) => {
            const next = Number(value[0]);
            if (ICON_SIZES.includes(next as (typeof ICON_SIZES)[number])) {
              setSize(next as (typeof ICON_SIZES)[number]);
            }
          }}
          aria-label="Icon preview size"
        >
          {ICON_SIZES.map((iconSize) => (
            <Toggle key={iconSize} value={String(iconSize)} className="px-3 font-mono text-xs">
              {iconSize}
            </Toggle>
          ))}
        </ToggleGroup>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {filtered.slice(0, 240).map(({ id, Icon }) => (
          <div
            key={id}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border border-border/40 bg-card/30 p-2",
            )}
            title={id}
          >
            <Icon size={size} className="text-foreground" aria-hidden />
            <span className="w-full truncate text-center font-mono text-[10px] text-muted-foreground">
              {id}
            </span>
          </div>
        ))}
      </div>
      {filtered.length > 240 ? (
        <p className="text-xs text-muted-foreground">
          Showing 240 of {filtered.length} icons — refine search to narrow results.
        </p>
      ) : null}
    </div>
  );
}
