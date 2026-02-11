"use client";

/**
 * UserRolesModal - Modal for managing user roles
 * Manages roles via user_roles junction table
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, X, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { updateUserRoles } from "@/app/actions/admin-listings";

// Icons

// Icon aliases for minimal code changes
const FiSave = Save;
const FiX = X;
const FiShield = Shield;
const FiUser = User;

interface UserProfile {
  id: string;
  first_name: string | null;
  second_name: string | null;
  email: string | null;
  roles?: string[];
}

interface Props {
  user: UserProfile;
  open: boolean;
  onClose: () => void;
}

const ROLE_DEFINITIONS = [
  {
    key: "admin",
    label: "Administrator",
    description: "Full access to admin panel and all features",
    icon: FiShield,
    color: "text-red-600",
  },
  {
    key: "volunteer",
    label: "Volunteer",
    description: "Can manage community events and volunteer activities",
    icon: FiUser,
    color: "text-blue-600",
  },
  {
    key: "subscriber",
    label: "Subscriber",
    description: "Basic user with standard access",
    icon: FiUser,
    color: "text-green-600",
  },
  {
    key: "organization",
    label: "Organization",
    description: "Represents a business, charity, or community group",
    icon: FiUser,
    color: "text-purple-600",
  },
  {
    key: "fridge_coordinator",
    label: "Fridge Coordinator",
    description: "Can manage community fridge listings",
    icon: FiUser,
    color: "text-cyan-600",
  },
  {
    key: "foodbank_coordinator",
    label: "Food Bank Coordinator",
    description: "Can manage food bank listings and operations",
    icon: FiUser,
    color: "text-orange-600",
  },
];

export function UserRolesModal({ user, open, onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize roles from user data (user_roles table)
  const userRoles = user.roles ?? [];
  const [roles, setRoles] = useState<Record<string, boolean>>(() => ({
    admin: userRoles.includes("admin"),
    volunteer: userRoles.includes("volunteer"),
    subscriber: userRoles.includes("subscriber") || userRoles.length === 0,
    organization: userRoles.includes("organization"),
    fridge_coordinator: userRoles.includes("fridge_coordinator"),
    foodbank_coordinator: userRoles.includes("foodbank_coordinator"),
  }));

  const toggleRole = (key: string) => {
    setRoles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await updateUserRoles(user.id, roles);

    if (result.success) {
      router.refresh();
      onClose();
    } else {
      setError(result.error || "Failed to update roles");
    }

    setSaving(false);
  };

  const userName = [user.first_name, user.second_name].filter(Boolean).join(" ") || "Unknown User";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Manage User Roles</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="font-medium text-gray-900 dark:text-gray-100">{userName}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>

          <Separator />

          {/* Role Toggles */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Assigned Roles
            </Label>

            {ROLE_DEFINITIONS.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.key}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <Checkbox
                    id={role.key}
                    checked={roles[role.key] ?? false}
                    onCheckedChange={() => toggleRole(role.key)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={role.key}
                      className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                    >
                      <Icon className={`h-4 w-4 ${role.color}`} />
                      {role.label}
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {role.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              <FiX className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <FiSave className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Roles"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
