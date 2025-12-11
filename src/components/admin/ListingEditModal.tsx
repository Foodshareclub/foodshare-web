"use client";

/**
 * ListingEditModal - Advanced modal for editing listing details
 * Full admin control over all listing fields with modern UI
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Save,
  MapPin,
  Clock,
  User,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Calendar,
  Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateListing, type UpdateListingData } from "@/app/actions/admin-listings";
import type { AdminListing } from "@/lib/data/admin-listings";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Props {
  listing: AdminListing;
  open: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: "food", label: "Food", color: "bg-emerald-100 text-emerald-700" },
  { value: "thing", label: "Things", color: "bg-blue-100 text-blue-700" },
  { value: "borrow", label: "Borrow", color: "bg-violet-100 text-violet-700" },
  { value: "wanted", label: "Wanted", color: "bg-amber-100 text-amber-700" },
  { value: "fridge", label: "Community Fridge", color: "bg-cyan-100 text-cyan-700" },
  { value: "foodbank", label: "Food Bank", color: "bg-rose-100 text-rose-700" },
  { value: "volunteer", label: "Volunteer", color: "bg-pink-100 text-pink-700" },
  { value: "zerowaste", label: "Zero Waste", color: "bg-lime-100 text-lime-700" },
  { value: "vegan", label: "Vegan", color: "bg-green-100 text-green-700" },
  { value: "organisation", label: "Organisation", color: "bg-indigo-100 text-indigo-700" },
];

export function ListingEditModal({ listing, open, onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

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

  const handleChange = (field: string, value: string | number | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

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
      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setError(result.error || "Failed to update listing");
    }

    setSaving(false);
  };

  const resetForm = () => {
    setFormData({
      post_name: listing.post_name,
      post_description: listing.post_description || "",
      post_type: listing.post_type,
      pickup_time: listing.pickup_time || "",
      available_hours: listing.available_hours || "",
      post_address: listing.post_address || "",
      is_active: listing.is_active,
      admin_notes: listing.admin_notes || "",
    });
    setError(null);
    setSuccess(false);
  };

  const images = listing.images?.filter(Boolean) || [];
  const categoryInfo = CATEGORIES.find((c) => c.value === listing.post_type);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {images[0] && (
                <Image
                  src={images[0]}
                  alt={listing.post_name}
                  width={56}
                  height={56}
                  className="rounded-lg object-cover"
                />
              )}
              <div>
                <DialogTitle className="text-lg font-semibold">Edit Listing</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn("text-xs", categoryInfo?.color)}>
                    {categoryInfo?.label || listing.post_type}
                  </Badge>
                  <Badge
                    variant={listing.is_active ? "default" : "secondary"}
                    className={cn(
                      "text-xs",
                      listing.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    )}
                  >
                    {listing.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">ID: {listing.id}</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-2 -mt-1"
              onClick={() => window.open(`/listing/${listing.id}`, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="border-b border-border/50 px-6">
            <TabsList className="bg-transparent h-auto p-0 gap-4">
              <TabsTrigger
                value="details"
                className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <FileText className="h-4 w-4 mr-2" />
                Details
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Media ({images.length})
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[60vh]">
            <form onSubmit={handleSubmit}>
              {/* Details Tab */}
              <TabsContent value="details" className="p-6 space-y-6 mt-0">
                {/* Owner Info Card */}
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {listing.profile?.first_name} {listing.profile?.second_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{listing.profile?.email}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Contact
                    </Button>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="post_name">Title *</Label>
                    <Input
                      id="post_name"
                      value={formData.post_name}
                      onChange={(e) => handleChange("post_name", e.target.value)}
                      className="mt-1.5"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="post_description">Description</Label>
                    <Textarea
                      id="post_description"
                      value={formData.post_description}
                      onChange={(e) => handleChange("post_description", e.target.value)}
                      rows={4}
                      className="mt-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="post_type">Category</Label>
                      <Select
                        value={formData.post_type}
                        onValueChange={(value) => handleChange("post_type", value)}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn("w-2 h-2 rounded-full", cat.color.split(" ")[0])}
                                />
                                {cat.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Views</Label>
                      <Input
                        value={listing.post_views.toLocaleString()}
                        disabled
                        className="mt-1.5 bg-muted"
                      />
                    </div>
                  </div>
                </div>

                {/* Pickup Details */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Pickup Details
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pickup_time">Pickup Time</Label>
                      <Input
                        id="pickup_time"
                        value={formData.pickup_time}
                        onChange={(e) => handleChange("pickup_time", e.target.value)}
                        placeholder="e.g., 9am - 5pm"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="available_hours">Available Days</Label>
                      <Input
                        id="available_hours"
                        value={formData.available_hours}
                        onChange={(e) => handleChange("available_hours", e.target.value)}
                        placeholder="e.g., Mon-Fri"
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="post_address">Address</Label>
                    <div className="relative mt-1.5">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="post_address"
                        value={formData.post_address}
                        onChange={(e) => handleChange("post_address", e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="p-6 space-y-6 mt-0">
                <div>
                  <Label className="mb-3 block">Images ({images.length})</Label>
                  {images.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {images.map((url, index) => (
                        <div key={index} className="relative group">
                          <Image
                            src={url!}
                            alt={`${listing.post_name} ${index + 1}`}
                            width={200}
                            height={200}
                            className="rounded-lg object-cover w-full aspect-square"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <Button size="icon" variant="secondary" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="destructive" className="h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {index === 0 && (
                            <Badge className="absolute top-2 left-2 text-xs">Primary</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No images uploaded</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="p-6 space-y-6 mt-0">
                {/* Visibility */}
                <div className="rounded-lg border border-border/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {formData.is_active ? (
                        <Eye className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <EyeOff className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">Listing Visibility</p>
                        <p className="text-sm text-muted-foreground">
                          {formData.is_active
                            ? "This listing is visible to all users"
                            : "This listing is hidden from users"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleChange("is_active", checked)}
                    />
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <Label htmlFor="admin_notes" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Admin Notes (Internal Only)
                  </Label>
                  <Textarea
                    id="admin_notes"
                    value={formData.admin_notes}
                    onChange={(e) => handleChange("admin_notes", e.target.value)}
                    rows={4}
                    placeholder="Internal notes about this listing..."
                    className="mt-1.5 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    These notes are only visible to admins
                  </p>
                </div>

                {/* Danger Zone */}
                <div className="rounded-lg border border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/20 p-4">
                  <h4 className="font-medium text-rose-700 dark:text-rose-400 mb-3">Danger Zone</h4>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Listing
                    </Button>
                    <Button variant="outline" size="sm">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Original
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="p-6 space-y-6 mt-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(listing.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span>{new Date(listing.updated_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Views:</span>
                    <span>{listing.post_views.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline">{listing.status}</Badge>
                  </div>
                </div>
              </TabsContent>
            </form>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border/50 px-6 py-4 bg-muted/30">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Changes saved successfully!
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
