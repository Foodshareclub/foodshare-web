"use client";

/**
 * AdminListingsClient - Client component for admin listings management
 * Handles filtering, selection, bulk actions, and editing
 */

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  activateListing,
  deactivateListing,
  deleteListing,
  bulkActivateListings,
  bulkDeactivateListings,
  bulkDeleteListings,
} from "@/app/actions/admin-listings";
import { ListingEditModal } from "./ListingEditModal";
import type { AdminListing, ListingStats, AdminListingsFilter } from "@/lib/data/admin-listings";

// Icons
import { Search, MoreVertical, Pencil, Trash2, Check, X, Eye, RefreshCw } from "lucide-react";

// Icon aliases for minimal code changes
const FiSearch = Search;
const FiMoreVertical = MoreVertical;
const FiEdit2 = Pencil;
const FiTrash2 = Trash2;
const FiCheck = Check;
const FiX = X;
const FiEye = Eye;
const FiRefreshCw = RefreshCw;

interface Props {
  initialListings: AdminListing[];
  initialTotal: number;
  initialPage: number;
  totalPages: number;
  stats: ListingStats;
  filters: AdminListingsFilter;
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "food", label: "Food" },
  { value: "thing", label: "Things" },
  { value: "borrow", label: "Borrow" },
  { value: "wanted", label: "Wanted" },
  { value: "fridge", label: "Community Fridge" },
  { value: "foodbank", label: "Food Bank" },
  { value: "volunteer", label: "Volunteer" },
  { value: "zerowaste", label: "Zero Waste" },
  { value: "vegan", label: "Vegan" },
];

export function AdminListingsClient({
  initialListings,
  initialTotal,
  initialPage,
  totalPages,
  stats,
  filters,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [editingListing, setEditingListing] = useState<AdminListing | null>(null);

  // Update URL params
  const updateFilters = (updates: Partial<AdminListingsFilter>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "all" && value !== "") {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });

    // Reset to page 1 when filters change
    if (!updates.page) params.delete("page");

    startTransition(() => {
      router.push(`/admin/listings?${params.toString()}`);
    });
  };

  // Handle search
  const handleSearch = () => {
    updateFilters({ search: searchInput });
  };

  // Handle selection
  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === initialListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(initialListings.map((l) => l.id)));
    }
  };

  // Bulk actions
  const handleBulkActivate = async () => {
    const ids = Array.from(selectedIds);
    const result = await bulkActivateListings(ids);
    if (result.success) {
      setSelectedIds(new Set());
      router.refresh();
    }
  };

  const handleBulkDeactivate = async () => {
    const ids = Array.from(selectedIds);
    const result = await bulkDeactivateListings(ids);
    if (result.success) {
      setSelectedIds(new Set());
      router.refresh();
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm("Are you sure you want to delete these listings?")) return;
    const ids = Array.from(selectedIds);
    const result = await bulkDeleteListings(ids);
    if (result.success) {
      setSelectedIds(new Set());
      router.refresh();
    }
  };

  // Single actions
  const handleActivate = async (id: number) => {
    const result = await activateListing(id);
    if (result.success) router.refresh();
  };

  const handleDeactivate = async (id: number) => {
    const result = await deactivateListing(id);
    if (result.success) router.refresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    const result = await deleteListing(id);
    if (result.success) router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Listings" value={stats.total} color="blue" />
        <StatCard label="Active" value={stats.active} color="green" />
        <StatCard label="Inactive" value={stats.inactive} color="orange" />
        <StatCard label="Arranged" value={stats.arranged} color="purple" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px] flex gap-2">
            <Input
              placeholder={t("search_listings")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} variant="outline" size="icon">
              <FiSearch className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Filter */}
          <Select
            value={filters.status || "all"}
            onValueChange={(value) =>
              updateFilters({ status: value as AdminListingsFilter["status"] })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Active</SelectItem>
              <SelectItem value="pending">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select
            value={filters.category || "all"}
            onValueChange={(value) => updateFilters({ category: value })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={filters.sortBy || "created_at"}
            onValueChange={(value) =>
              updateFilters({ sortBy: value as AdminListingsFilter["sortBy"] })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="updated_at">Last Updated</SelectItem>
              <SelectItem value="post_name">Name</SelectItem>
              <SelectItem value="post_views">Views</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.refresh()}
            disabled={isPending}
          >
            <FiRefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 flex items-center justify-between">
          <span className="text-blue-800 dark:text-blue-200 font-medium">
            {selectedIds.size} listing(s) selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleBulkActivate}>
              <FiCheck className="h-4 w-4 mr-1" /> Activate
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkDeactivate}>
              <FiX className="h-4 w-4 mr-1" /> Deactivate
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <FiTrash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      )}

      {/* Listings Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="p-3 text-left">
                <Checkbox
                  checked={
                    selectedIds.size === initialListings.length && initialListings.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                Listing
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                Category
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                Status
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                Views
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                Created
              </th>
              <th className="p-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {initialListings.map((listing) => (
              <tr key={listing.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="p-3">
                  <Checkbox
                    checked={selectedIds.has(listing.id)}
                    onCheckedChange={() => toggleSelect(listing.id)}
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {listing.gif_url && (
                      <Image
                        src={listing.gif_url}
                        alt={listing.post_name}
                        width={48}
                        height={48}
                        className="rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                        {listing.post_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                        {listing.profile?.email || "Unknown user"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="capitalize">
                    {listing.post_type}
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge
                    variant={listing.is_active ? "default" : "secondary"}
                    className={cn(
                      listing.is_active
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                    )}
                  >
                    {listing.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="p-3 text-gray-600 dark:text-gray-400">{listing.post_views}</td>
                <td className="p-3 text-sm text-gray-500 dark:text-gray-400">
                  {new Date(listing.created_at).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <FiMoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingListing(listing)}>
                        <FiEdit2 className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => window.open(`/listing/${listing.id}`, "_blank")}
                      >
                        <FiEye className="h-4 w-4 mr-2" /> View
                      </DropdownMenuItem>
                      {listing.is_active ? (
                        <DropdownMenuItem onClick={() => handleDeactivate(listing.id)}>
                          <FiX className="h-4 w-4 mr-2" /> Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleActivate(listing.id)}>
                          <FiCheck className="h-4 w-4 mr-2" /> Activate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(listing.id)}
                        className="text-red-600 dark:text-red-400"
                      >
                        <FiTrash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {initialListings.length === 0 && (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">No listings found</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={initialPage <= 1}
            onClick={() => updateFilters({ page: initialPage - 1 })}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600 dark:text-gray-400">
            Page {initialPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={initialPage >= totalPages}
            onClick={() => updateFilters({ page: initialPage + 1 })}
          >
            Next
          </Button>
        </div>
      )}

      {/* Edit Modal */}
      {editingListing && (
        <ListingEditModal
          listing={editingListing}
          open={!!editingListing}
          onClose={() => setEditingListing(null)}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400",
    green:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400",
    orange:
      "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400",
    purple:
      "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400",
  };

  return (
    <div className={cn("rounded-lg border p-4", colorClasses[color as keyof typeof colorClasses])}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}
