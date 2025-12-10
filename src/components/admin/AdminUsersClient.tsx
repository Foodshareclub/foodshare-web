"use client";

/**
 * AdminUsersClient - Client component for admin user management
 * Handles filtering, role management, and user actions
 */

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MoreVertical, Shield, User, RefreshCw, Mail, Eye } from "lucide-react";
import { UserRolesModal } from "./UserRolesModal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AdminUserProfile, UserStats, AdminUsersFilter } from "@/lib/data/admin-users";

// Icon aliases for minimal code changes
const FiSearch = Search;
const FiMoreVertical = MoreVertical;
const FiShield = Shield;
const _FiUser = User;
const FiRefreshCw = RefreshCw;
const FiMail = Mail;
const FiEye = Eye;

interface Props {
  initialUsers: AdminUserProfile[];
  _initialTotal: number;
  initialPage: number;
  totalPages: number;
  stats: UserStats;
  filters: AdminUsersFilter;
}

export function AdminUsersClient({
  initialUsers,
  _initialTotal,
  initialPage,
  totalPages,
  stats,
  filters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [editingUser, setEditingUser] = useState<AdminUserProfile | null>(null);

  // Update URL params
  const updateFilters = (updates: Partial<AdminUsersFilter>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== "all" && value !== "") {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });

    if (!updates.page) params.delete("page");

    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`);
    });
  };

  const handleSearch = () => {
    updateFilters({ search: searchInput });
  };

  const getInitials = (user: AdminUserProfile) => {
    const first = user.first_name?.[0] || "";
    const second = user.second_name?.[0] || "";
    return (first + second).toUpperCase() || "U";
  };

  const getRoleBadges = (user: AdminUserProfile) => {
    const badges: { label: string; color: string }[] = [];
    const roles = user.roles ?? [];

    // Role color mapping
    const roleConfig: Record<string, { label: string; color: string }> = {
      superadmin: {
        label: "Superadmin",
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      },
      admin: {
        label: "Admin",
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      },
      volunteer: {
        label: "Volunteer",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      },
      organization: {
        label: "Organization",
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      },
      fridge_coordinator: {
        label: "Fridge Coord",
        color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
      },
      foodbank_coordinator: {
        label: "Foodbank Coord",
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      },
    };

    // Add badges for each role
    roles.forEach((role) => {
      const config = roleConfig[role];
      if (config) {
        badges.push(config);
      }
    });

    // Default user badge if no roles
    if (badges.length === 0) {
      badges.push({
        label: "User",
        color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      });
    }

    return badges;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Users" value={stats.total} color="blue" />
        <StatCard label="Active" value={stats.active} color="green" />
        <StatCard label="Verified" value={stats.verified} color="purple" />
        <StatCard label="Admins" value={stats.admins} color="red" />
        <StatCard label="New This Week" value={stats.newThisWeek} color="orange" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px] flex gap-2">
            <Input
              placeholder="Search users..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} variant="outline" size="icon">
              <FiSearch className="h-4 w-4" />
            </Button>
          </div>

          {/* Role Filter */}
          <Select
            value={filters.role || "all"}
            onValueChange={(value) => updateFilters({ role: value })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="superadmin">Superadmin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>

          {/* Active Filter */}
          <Select
            value={
              filters.isActive === true ? "active" : filters.isActive === false ? "inactive" : "all"
            }
            onValueChange={(value) =>
              updateFilters({
                isActive: value === "active" ? true : value === "inactive" ? false : undefined,
              })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={filters.sortBy || "created_time"}
            onValueChange={(value) =>
              updateFilters({ sortBy: value as AdminUsersFilter["sortBy"] })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_time">Date Joined</SelectItem>
              <SelectItem value="last_seen_at">Last Active</SelectItem>
              <SelectItem value="first_name">Name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
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

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="p-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                User
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                Roles
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                Status
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                Joined
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                Last Active
              </th>
              <th className="p-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {initialUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={user.avatar_url || undefined}
                        alt={user.first_name || "User"}
                      />
                      <AvatarFallback>{getInitials(user)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {user.first_name} {user.second_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {getRoleBadges(user).map((badge, i) => (
                      <Badge key={i} variant="outline" className={cn("text-xs", badge.color)}>
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={user.is_active ? "default" : "secondary"}
                      className={cn(
                        user.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                      )}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {user.is_verified && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        Verified
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="p-3 text-sm text-gray-500 dark:text-gray-400">
                  {new Date(user.created_time).toLocaleDateString()}
                </td>
                <td className="p-3 text-sm text-gray-500 dark:text-gray-400">
                  {user.last_seen_at ? new Date(user.last_seen_at).toLocaleDateString() : "Never"}
                </td>
                <td className="p-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <FiMoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingUser(user)}>
                        <FiShield className="h-4 w-4 mr-2" /> Manage Roles
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => window.open(`/profile/${user.id}`, "_blank")}
                      >
                        <FiEye className="h-4 w-4 mr-2" /> View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(`mailto:${user.email}`)}>
                        <FiMail className="h-4 w-4 mr-2" /> Send Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {initialUsers.length === 0 && (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">No users found</div>
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

      {/* Role Management Modal */}
      {editingUser && (
        <UserRolesModal
          user={editingUser}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
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
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
  };

  return (
    <div className={cn("rounded-lg border p-4", colorClasses[color as keyof typeof colorClasses])}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}
