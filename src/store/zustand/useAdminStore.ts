/**
 * Admin Store (Zustand)
 * Manages admin UI state - modal state, selected listing, filters
 * Works alongside React Query for server state
 */

import { create } from "zustand";
import type { PostWithAdminFields, AdminListingsFilter } from "@/types/admin.types";

// ============================================================================
// Types
// ============================================================================

interface AdminUIState {
  // Detail modal state
  detailModalOpen: boolean;
  selectedListing: PostWithAdminFields | null;
  selectedListingId: number | null;

  // Filters (client-side UI state)
  filters: AdminListingsFilter;

  // Pagination
  pagination: {
    page: number;
    pageSize: number;
  };

  // Actions
  openDetailModal: (listing: PostWithAdminFields) => void;
  closeDetailModal: () => void;
  setSelectedListing: (listing: PostWithAdminFields | null) => void;

  // Filter actions
  setStatusFilter: (status: AdminListingsFilter["status"]) => void;
  setSearchTerm: (term: string) => void;
  setCategoryFilter: (category: string) => void;
  setSortBy: (sortBy: AdminListingsFilter["sortBy"], sortOrder: AdminListingsFilter["sortOrder"]) => void;
  setDateRange: (dateFrom: string | null, dateTo: string | null) => void;
  setFlaggedOnly: (flagged: boolean) => void;
  resetFilters: () => void;

  // Pagination actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Reset
  reset: () => void;
}

// ============================================================================
// Default Values
// ============================================================================

const defaultFilters: AdminListingsFilter = {
  status: "all",
  searchTerm: "",
  category: "all",
  sortBy: "created_at",
  sortOrder: "desc",
  dateFrom: null,
  dateTo: null,
  flaggedOnly: false,
};

const defaultPagination = {
  page: 1,
  pageSize: 20,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useAdminStore = create<AdminUIState>((set) => ({
  // Modal state
  detailModalOpen: false,
  selectedListing: null,
  selectedListingId: null,

  // Filters
  filters: defaultFilters,

  // Pagination
  pagination: defaultPagination,

  // Modal actions
  openDetailModal: (listing) =>
    set({
      detailModalOpen: true,
      selectedListing: listing,
      selectedListingId: listing.id,
    }),

  closeDetailModal: () =>
    set({
      detailModalOpen: false,
      selectedListing: null,
      selectedListingId: null,
    }),

  setSelectedListing: (listing) =>
    set({
      selectedListing: listing,
      selectedListingId: listing?.id ?? null,
    }),

  // Filter actions
  setStatusFilter: (status) =>
    set((state) => ({
      filters: { ...state.filters, status },
      pagination: { ...state.pagination, page: 1 },
    })),

  setSearchTerm: (searchTerm) =>
    set((state) => ({
      filters: { ...state.filters, searchTerm },
      pagination: { ...state.pagination, page: 1 },
    })),

  setCategoryFilter: (category) =>
    set((state) => ({
      filters: { ...state.filters, category },
      pagination: { ...state.pagination, page: 1 },
    })),

  setSortBy: (sortBy, sortOrder) =>
    set((state) => ({
      filters: { ...state.filters, sortBy, sortOrder },
    })),

  setDateRange: (dateFrom, dateTo) =>
    set((state) => ({
      filters: { ...state.filters, dateFrom, dateTo },
      pagination: { ...state.pagination, page: 1 },
    })),

  setFlaggedOnly: (flaggedOnly) =>
    set((state) => ({
      filters: { ...state.filters, flaggedOnly },
      pagination: { ...state.pagination, page: 1 },
    })),

  resetFilters: () =>
    set({
      filters: defaultFilters,
      pagination: { ...defaultPagination, page: 1 },
    }),

  // Pagination actions
  setPage: (page) =>
    set((state) => ({
      pagination: { ...state.pagination, page },
    })),

  setPageSize: (pageSize) =>
    set((state) => ({
      pagination: { ...state.pagination, pageSize, page: 1 },
    })),

  // Reset all state
  reset: () =>
    set({
      detailModalOpen: false,
      selectedListing: null,
      selectedListingId: null,
      filters: defaultFilters,
      pagination: defaultPagination,
    }),
}));

// ============================================================================
// Selectors (pure functions for use with useAdminStore)
// ============================================================================

export const selectDetailModalOpen = (state: AdminUIState) => state.detailModalOpen;
export const selectSelectedListing = (state: AdminUIState) => state.selectedListing;
export const selectAdminFilters = (state: AdminUIState) => state.filters;
export const selectAdminPagination = (state: AdminUIState) => state.pagination;

// ============================================================================
// Custom Hooks (convenience hooks for common selections)
// ============================================================================

export const useDetailModalOpen = () => useAdminStore(selectDetailModalOpen);
export const useSelectedListing = () => useAdminStore(selectSelectedListing);
export const useAdminFilters = () => useAdminStore(selectAdminFilters);
export const useAdminPagination = () => useAdminStore(selectAdminPagination);
