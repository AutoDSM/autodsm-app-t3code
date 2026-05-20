import { create } from "zustand";

import { setComponentPreviewOverlaySuppressed } from "~/lib/componentPreviewOverlaySuppression";

const useModelPickerOpenStore = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>((set) => ({
  open: false,
  setOpen: (open) =>
    set((current) => {
      if (current.open === open) {
        return current;
      }
      setComponentPreviewOverlaySuppressed("model-picker", open);
      return { open };
    }),
}));

export function useModelPickerOpen(): boolean {
  return useModelPickerOpenStore((store) => store.open);
}

export function setModelPickerOpen(open: boolean): void {
  useModelPickerOpenStore.getState().setOpen(open);
}

export function getModelPickerOpen(): boolean {
  return useModelPickerOpenStore.getState().open;
}

export function subscribeModelPickerOpen(listener: (open: boolean) => void): () => void {
  return useModelPickerOpenStore.subscribe((state, previous) => {
    if (state.open !== previous.open) {
      listener(state.open);
    }
  });
}
