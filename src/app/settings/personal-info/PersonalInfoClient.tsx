"use client";

/**
 * Personal Info Client Component
 * Premium profile editing with avatar upload and modern design
 */

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { User, Mail, Phone, MapPin, ChevronRight, Check, X, Camera, Loader2 } from "lucide-react";

// Icon aliases for consistency
const FaUser = User;
const FaEnvelope = Mail;
const FaPhone = Phone;
const FaMapMarkerAlt = MapPin;
const FaChevronRight = ChevronRight;
const FaCheck = Check;
const FaTimes = X;
const FaCamera = Camera;
const FaSpinner = Loader2;
import { useRouter } from "next/navigation";
import { uploadProfileAvatar } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ALLOWED_MIME_TYPES } from "@/constants/mime-types";
import type { AuthUser } from "@/app/actions/auth";
import type { Profile } from "@/lib/data/profiles";

interface PersonalInfoClientProps {
  user: AuthUser;
  /** Profile data passed from server */
  initialProfile?: Profile | null;
  /** Address data passed from server */
  initialAddress?: {
    profile_id: string;
    address_line_1?: string | null;
    city?: string | null;
    postal_code?: string | null;
    country?: number | null;
  } | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

interface InfoCardProps {
  icon: React.ReactNode;
  gradient: string;
  title: string;
  children: React.ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  canEdit?: boolean;
  editDisabled?: boolean;
  isSaving?: boolean;
}

function InfoCard({
  icon,
  gradient,
  title,
  children,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  canEdit = true,
  editDisabled = false,
  isSaving = false,
}: InfoCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="group relative bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 hover:border-border hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br shadow-lg",
            gradient
          )}
        >
          <span className="text-white">{icon}</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/20 to-transparent" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {canEdit && !isEditing && (
              <Button
                onClick={onEdit}
                variant="ghost"
                size="sm"
                disabled={editDisabled}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                Edit
              </Button>
            )}
          </div>
          {children}
          {isEditing && (
            <div className="flex gap-2 mt-4">
              <Button
                onClick={onSave}
                size="sm"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? (
                  <FaSpinner className="w-3 h-3 mr-1.5 animate-spin" />
                ) : (
                  <FaCheck className="w-3 h-3 mr-1.5" />
                )}
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button onClick={onCancel} variant="outline" size="sm" disabled={isSaving}>
                <FaTimes className="w-3 h-3 mr-1.5" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function PersonalInfoClient({
  user,
  initialProfile,
  initialAddress,
}: PersonalInfoClientProps) {
  const router = useRouter();

  // Use server-provided data
  const currentProfile = initialProfile;
  const address = initialAddress;
  const avatarUrl = initialProfile?.avatar_url;
  const isLoading = false; // Data is already loaded from server
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentProfile) {
      setFirstName(currentProfile.first_name || "");
      setLastName(currentProfile.second_name || "");
      setPhone(currentProfile.phone || "");
    }
  }, [currentProfile]);

  useEffect(() => {
    if (address) {
      setStreetAddress(address.address_line_1 || "");
      setCity(address.city || "");
      setPostalCode(address.postal_code || "");
      setCountry(String(address.country || ""));
    }
  }, [address]);

  const isAnyEditing = editingName || editingPhone || editingAddress;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user.id) return;

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user.id);
      await uploadProfileAvatar(formData);
      router.refresh();
    } catch (error) {
      // Revert preview on error
      setPreviewUrl(null);
      console.error("Failed to upload avatar:", error);
    } finally {
      setIsUploadingAvatar(false);
    }

    // Clean up input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveName = async () => {
    if (!currentProfile?.id) return;
    setIsSaving(true);
    try {
      // TODO: Use updateProfile Server Action
      // For now, just close the edit mode
      setEditingName(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePhone = async () => {
    if (!currentProfile?.id) return;
    setIsSaving(true);
    try {
      // TODO: Use updateProfile Server Action
      setEditingPhone(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!address) return;
    setIsSaving(true);
    try {
      // TODO: Use updateAddress Server Action
      setEditingAddress(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelName = () => {
    setFirstName(currentProfile?.first_name || "");
    setLastName(currentProfile?.second_name || "");
    setEditingName(false);
  };

  const handleCancelPhone = () => {
    setPhone(currentProfile?.phone || "");
    setEditingPhone(false);
  };

  const handleCancelAddress = () => {
    setStreetAddress(address?.address_line_1 || "");
    setCity(address?.city || "");
    setPostalCode(address?.postal_code || "");
    setCountry(String(address?.country || ""));
    setEditingAddress(false);
  };

  const displayAvatarUrl = previewUrl || avatarUrl;

  if (isLoading && !currentProfile) {
    return (
      <div className="bg-gradient-to-b from-background via-muted/30 to-background pb-10">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-32 bg-card rounded-2xl border border-border animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-background via-muted/30 to-background pb-10">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-6 text-sm">
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Settings
            </Link>
            <FaChevronRight className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-foreground font-medium">Personal info</span>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <FaUser className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Personal info</h1>
            </div>
            <p className="text-muted-foreground">
              Manage your personal details and how we can reach you
            </p>
          </motion.div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {/* Profile Photo */}
          <motion.div
            variants={itemVariants}
            className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 hover:border-border hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-300"
          >
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div
                  className={cn(
                    "relative w-24 h-24 rounded-full overflow-hidden",
                    "ring-4 ring-background shadow-xl",
                    "transition-transform duration-300 group-hover:scale-105"
                  )}
                >
                  {displayAvatarUrl ? (
                    <Image
                      src={displayAvatarUrl}
                      alt="Profile photo"
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                      <span className="text-3xl text-white font-semibold">
                        {firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                  )}

                  {/* Upload overlay */}
                  <button
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                    className={cn(
                      "absolute inset-0 bg-black/50 flex items-center justify-center",
                      "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                      "cursor-pointer"
                    )}
                  >
                    {isUploadingAvatar ? (
                      <FaSpinner className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <FaCamera className="w-6 h-6 text-white" />
                    )}
                  </button>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_MIME_TYPES.PROFILES.join(",")}
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* Info */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">Profile photo</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Click on the photo to upload a new image. JPG or PNG, max 10MB.
                </p>
                <Button
                  onClick={handleAvatarClick}
                  variant="outline"
                  size="sm"
                  disabled={isUploadingAvatar}
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                >
                  {isUploadingAvatar ? (
                    <>
                      <FaSpinner className="w-3 h-3 mr-1.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaCamera className="w-3 h-3 mr-1.5" />
                      Change photo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>

          <Separator className="my-6 bg-border/50" />

          {/* Name */}
          <InfoCard
            icon={<FaUser className="w-5 h-5" />}
            gradient="from-blue-500 to-cyan-500"
            title="Legal name"
            isEditing={editingName}
            onEdit={() => setEditingName(true)}
            onSave={handleSaveName}
            onCancel={handleCancelName}
            editDisabled={isAnyEditing && !editingName}
            isSaving={isSaving}
          >
            {editingName ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-xs text-muted-foreground">
                    First name
                  </Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1"
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-xs text-muted-foreground">
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1"
                    placeholder="Doe"
                  />
                </div>
              </div>
            ) : (
              <p className="text-foreground">
                {firstName && lastName ? `${firstName} ${lastName}` : "Not provided"}
              </p>
            )}
          </InfoCard>

          {/* Email */}
          <InfoCard
            icon={<FaEnvelope className="w-5 h-5" />}
            gradient="from-violet-500 to-purple-500"
            title="Email address"
            isEditing={false}
            onEdit={() => {}}
            onSave={() => {}}
            onCancel={() => {}}
            canEdit={false}
          >
            <p className="text-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Email changes require verification through account security
            </p>
          </InfoCard>

          {/* Phone */}
          <InfoCard
            icon={<FaPhone className="w-5 h-5" />}
            gradient="from-emerald-500 to-teal-500"
            title="Phone number"
            isEditing={editingPhone}
            onEdit={() => setEditingPhone(true)}
            onSave={handleSavePhone}
            onCancel={handleCancelPhone}
            editDisabled={isAnyEditing && !editingPhone}
            isSaving={isSaving}
          >
            {editingPhone ? (
              <div>
                <Label htmlFor="phone" className="text-xs text-muted-foreground">
                  Phone number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1"
                />
              </div>
            ) : (
              <p className="text-foreground">{phone || "Not provided"}</p>
            )}
          </InfoCard>

          <Separator className="my-6 bg-border/50" />

          {/* Address */}
          <InfoCard
            icon={<FaMapMarkerAlt className="w-5 h-5" />}
            gradient="from-orange-500 to-amber-500"
            title="Address"
            isEditing={editingAddress}
            onEdit={() => setEditingAddress(true)}
            onSave={handleSaveAddress}
            onCancel={handleCancelAddress}
            editDisabled={isAnyEditing && !editingAddress}
            isSaving={isSaving}
          >
            {editingAddress ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="streetAddress" className="text-xs text-muted-foreground">
                    Street address
                  </Label>
                  <Input
                    id="streetAddress"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    className="mt-1"
                    placeholder="123 Main St"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-xs text-muted-foreground">
                      City
                    </Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="mt-1"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode" className="text-xs text-muted-foreground">
                      Postal code
                    </Label>
                    <Input
                      id="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="mt-1"
                      placeholder="10001"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="country" className="text-xs text-muted-foreground">
                    Country
                  </Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1"
                    placeholder="United States"
                  />
                </div>
              </div>
            ) : (
              <div className="text-foreground">
                {streetAddress ? (
                  <>
                    <p>{streetAddress}</p>
                    <p className="text-muted-foreground">
                      {[city, postalCode].filter(Boolean).join(", ")}
                    </p>
                    {country && <p className="text-muted-foreground">{country}</p>}
                  </>
                ) : (
                  <p className="text-muted-foreground">Not provided</p>
                )}
              </div>
            )}
          </InfoCard>
        </motion.div>
      </main>
    </div>
  );
}

export default PersonalInfoClient;
