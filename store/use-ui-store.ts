import { create } from "zustand";

type UiState = {
  commandMenuOpen: boolean;
  setCommandMenuOpen: (open: boolean) => void;
  toggleCommandMenu: () => void;
  activeThreadId: string | null;
  setActiveThreadId: (threadId: string | null) => void;
};

export const useUiStore = create<UiState>((set, get) => ({
  commandMenuOpen: false,
  setCommandMenuOpen: (open) => set({ commandMenuOpen: open }),
  toggleCommandMenu: () => set({ commandMenuOpen: !get().commandMenuOpen }),
  activeThreadId: null,
  setActiveThreadId: (threadId) => set({ activeThreadId: threadId }),
}));
