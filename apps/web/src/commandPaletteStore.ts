import { create } from "zustand";

import { setComponentPreviewOverlaySuppressed } from "~/lib/componentPreviewOverlaySuppression";

interface CommandPaletteOpenIntent {
  kind: "add-project";
  requestId: number;
}

interface CommandPaletteStore {
  open: boolean;
  openIntent: CommandPaletteOpenIntent | null;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  openAddProject: () => void;
  clearOpenIntent: () => void;
}

function syncCommandPaletteOverlaySuppression(open: boolean): void {
  setComponentPreviewOverlaySuppressed("command-palette", open);
}

export const useCommandPaletteStore = create<CommandPaletteStore>((set) => ({
  open: false,
  openIntent: null,
  setOpen: (open) => {
    syncCommandPaletteOverlaySuppression(open);
    set({ open, ...(open ? {} : { openIntent: null }) });
  },
  toggleOpen: () =>
    set((state) => {
      const nextOpen = !state.open;
      syncCommandPaletteOverlaySuppression(nextOpen);
      return { open: nextOpen, ...(state.open ? { openIntent: null } : {}) };
    }),
  openAddProject: () => {
    syncCommandPaletteOverlaySuppression(true);
    set((state) => ({
      open: true,
      openIntent: {
        kind: "add-project",
        requestId: (state.openIntent?.requestId ?? 0) + 1,
      },
    }));
  },
  clearOpenIntent: () => set({ openIntent: null }),
}));
