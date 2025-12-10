"use client";

/**
 * ListingEditModal - Modal for editing listing details
 * Allows admins to edit any listing fields
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { updateListing, type UpdateListingData } from "@/app/actions/admin-listings";
import type { AdminListing } from "@/lib/data/admin-listings";

// Icons
import { Save, X, MapPin, Clock, User } from "lucide-react";

// Icon aliases for minimal code changes
const FiSave = Save;
const FiX = X;
const FiMapPin = MapPin;
const FiClock = Clock;
const FiUser = User;

interface Props {
  listing: AdminListing;
  open: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "thing", label: "Things" },
  { value: "borrow", label: "Borrow" },
  { value: "wanted", label: "Wanted" },
  { value: "fridge", label: "Community Fridge" },
  { value: "foodbank", label: "Food Bank" },
  { value: "volunteer", label: "Volunteer" },
  { value: "zerowaste", label: "Zero Waste" },
  { value: "vegan", label: "Vegan" },
  { value: "organisation", label: "Organisation" },
];

export function ListingEditModal({ listing, open, onClose }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    post_name: listing.post_name,
    post_description: listing.post_description || "",
    post_type: listing.post_type,
    pickup_time: listing.pickup_time || "",
    available_hours: listing.available_hours || "",
    post_address: listing.post_address || "",
    is_active: listing.is_active,
    admin_notes: listing.admin_notes || "",
  });

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const updateData: UpdateListingData = {
      post_name: formData.post_name,
      post_description: formData.post_description || undefined,
      post_type: formData.post_type,
      pickup_time: formData.pickup_time || undefined,
      available_hours: formData.available_hours || undefined,
      post_address: formData.post_address || undefined,
      is_active: formData.is_active,
      admin_notes: formData.admin_notes || undefined,
    };

    const result = await updateListing(listing.id, updateData);

    if (result.success) {
      router.refresh();
      onClose();
    } else {
      setError(result.error || "Failed to update listing");
    }

    setSaving(false);
  };

  const images = listing.images?.filter(Boolean) || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Listing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Images Preview */}
          {images.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Images
              </Label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((url, index) => (
                  <Image
                    key={index}
                    src={url!}
                    alt={`${listing.post_name} ${index + 1}`}
                    width={120}
                    height={120}
                    className="rounded-lg object-cover flex-shrink-0"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Owner Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FiUser className="h-4 w-4" />
              <span>
                Owner: {listing.profile?.first_name} {listing.profile?.second_name}
              </span>
              <span className="text-gray-400">({listing.profile?.email})</span>
            </div>
          </div>

          <Separator />

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="post_name">Title *</Label>
              <Input
                id="post_name"
                value={formData.post_name}
                onChange={(e) => handleChange("post_name", e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="post_description">Description</Label>
              <Textarea
                id="post_description"
                value={formData.post_description}
                onChange={(e) => handleChange("post_description", e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="post_type">Category</Label>
              <Select
                value={formData.post_type}
                onValueChange={(value) => handleChange("post_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange("is_active", checked === true)}
              />
              <Label htmlFor="is_active">Active (visible to users)</Label>
            </div>
          </div>

          <Separator />

          {/* Pickup Details */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FiClock className="h-4 w-4" /> Pickup Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pickup_time">Pickup Time</Label>
                <Input
                  id="pickup_time"
                  value={formData.pickup_time}
                  onChange={(e) => handleChange("pickup_time", e.target.value)}
                  placeholder="e.g., 9am - 5pm"
                />
              </div>

              <div>
                <Label htmlFor="available_hours">Available Hours</Label>
                <Input
                  id="available_hours"
                  value={formData.available_hours}
                  onChange={(e) => handleChange("available_hours", e.target.value)}
                  placeholder="e.g., Mon-Fri"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FiMapPin className="h-4 w-4" /> Location
            </h3>

            <div>
              <Label htmlFor="post_address">Address</Label>
              <Input
                id="post_address"
                value={formData.post_address}
                onChange={(e) => handleChange("post_address", e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Admin Notes */}
          <div>
            <Label htmlFor="admin_notes">Admin Notes (Internal)</Label>
            <Textarea
              id="admin_notes"
              value={formData.admin_notes}
              onChange={(e) => handleChange("admin_notes", e.target.value)}
              rows={3}
              placeholder="Internal notes about this listing..."
              className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
            />
            <p className="text-xs text-gray-500 mt-1">These notes are only visible to admins</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              <FiX className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <FiSave className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
