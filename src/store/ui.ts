import { create } from 'zustand';

/** Ephemeral UI state only — never mirror TanStack Query results here. */
type UiState = Record<string, never>;

export const useUiStore = create<UiState>(() => ({}));
