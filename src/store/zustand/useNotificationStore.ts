/**
 * Notification Store (Zustand)
 * Manages notification UI state (not data - that's server-side)
 */

import { create } from "zustand";

// ============================================================================
// Types
// ============================================================================

interface NotificationUIState {
  // Panel state
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;

  // Filter state
  filter: "all" | "unread";
  setFilter: (filter: "all" | "unread") => void;

  // Loading states
  isMarkingAllRead: boolean;
  setIsMarkingAllRead: (loading: boolean) => void;

  // Reset
  reset: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useNotificationStore = create<NotificationUIState>((set) => ({
  // Panel state
  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),

  // Filter state
  filter: "all",
  setFilter: (filter) => set({ filter }),

  // Loading states
  isMarkingAllRead: false,
  setIsMarkingAllRead: (loading) => set({ isMarkingAllRead: loading }),

  // Reset
  reset: () =>
    set({
      isOpen: false,
      filter: "all",
      isMarkingAllRead: false,
    }),
}));

// ============================================================================
// Selectors
// ============================================================================

export const selectIsOpen = (state: NotificationUIState) => state.isOpen;
export const selectFilter = (state: NotificationUIState) => state.filter;

// ============================================================================
// Custom Hooks
// ============================================================================

export const useNotificationPanel = () => {
  const isOpen = useNotificationStore(selectIsOpen);
  const setIsOpen = useNotificationStore((state) => state.setIsOpen);
  const toggle = useNotificationStore((state) => state.toggle);
  return { isOpen, setIsOpen, toggle };
};

export const useNotificationFilter = () => {
  const filter = useNotificationStore(selectFilter);
  const setFilter = useNotificationStore((state) => state.setFilter);
  return { filter, setFilter };
};
