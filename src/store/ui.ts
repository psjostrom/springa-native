import { create } from 'zustand';

/** Ephemeral UI state only — never mirror TanStack Query results here. */
type UiState = {
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  selectedEventId: null,
  setSelectedEventId: (id) => set({ selectedEventId: id }),
}));
