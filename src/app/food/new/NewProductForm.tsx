"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createProduct } from "@/app/actions/products";
import { useUIStore } from "@/store/zustand/useUIStore";
import { storageAPI } from "@/api/storageAPI";
import Navbar from "@/components/header/navbar/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STORAGE_BUCKETS, getStorageUrl } from "@/constants/storage";

// Volunteer skills options
const VOLUNTEER_SKILLS = [
  { id: "driving", label: "Driving/Delivery", icon: "🚗" },
  { id: "cooking", label: "Cooking", icon: "👨‍🍳" },
  { id: "organizing", label: "Organizing", icon: "📋" },
  { id: "social", label: "Social Media", icon: "📱" },
  { id: "photo", label: "Photography", icon: "📸" },
  { id: "translation", label: "Translation", icon: "🌐" },
  { id: "tech", label: "Tech/Coding", icon: "💻" },
  { id: "outreach", label: "Community Outreach", icon: "🤝" },
] as const;

// Availability options
const AVAILABILITY_OPTIONS = [
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "evenings", label: "Evenings" },
  { value: "flexible", label: "Flexible" },
] as const;

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const MAX_FILE_SIZE_MB = 10;
const MAX_IMAGES = 4;

type FormData = {
  post_name: string;
  post_description: string;
  post_type: string;
  available_hours: string;
  transportation: string;
  post_address: string;
  post_stripped_address: string;
  // Volunteer-specific fields
  volunteer_skills: string[];
};

interface NewProductFormProps {
  userId: string;
  /** Profile data passed from server */
  profile?: {
    first_name?: string | null;
    second_name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  } | null;
  /** Admin status passed from server */
  isAdmin?: boolean;
}

export function NewProductForm({ userId, profile, isAdmin = false }: NewProductFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { userLocation: _userLocation } = useUIStore();

  // Auth for navbar (client-side for real-time updates)
  const { isAuthenticated } = useAuth();
  const avatarUrl = profile?.avatar_url;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    post_name: "",
    post_description: "",
    post_type: "food",
    available_hours: "",
    transportation: "pickup",
    post_address: "",
    post_stripped_address: "",
    volunteer_skills: [],
  });

  const isVolunteerForm = formData.post_type === "volunteer";

  const handleSkillToggle = (skillId: string) => {
    setFormData((prev) => ({
      ...prev,
      volunteer_skills: prev.volunteer_skills.includes(skillId)
        ? prev.volunteer_skills.filter((id) => id !== skillId)
        : [...prev.volunteer_skills, skillId],
    }));
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);

      if (selectedImages.length + files.length > MAX_IMAGES) {
        setError(`You can only upload up to ${MAX_IMAGES} images`);
        return;
      }

      const validFiles: File[] = [];
      const newPreviews: string[] = [];

      files.forEach((file) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          setError(`Invalid file type: ${file.name}. Please use PNG, JPEG, or WebP.`);
          return;
        }

        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          setError(`File ${file.name} is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
          return;
        }

        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      });

      setSelectedImages((prev) => [...prev, ...validFiles]);
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    },
    [selectedImages]
  );

  const handleRemoveImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index]);
      return updated;
    });
  }, []);

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of selectedImages) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      try {
        await storageAPI.uploadImage({
          bucket: STORAGE_BUCKETS.POSTS,
          filePath: fileName,
          file,
        });

        const publicUrl = getStorageUrl(STORAGE_BUCKETS.POSTS, fileName);
        uploadedUrls.push(publicUrl);
      } catch (err) {
        console.error("Error uploading image:", err);
        throw new Error(`Failed to upload ${file.name}`);
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation - different requirements for volunteers
    if (isVolunteerForm) {
      // Volunteer-specific validation
      if (!formData.post_name.trim()) {
        setError("Please enter your name/title");
        return;
      }

      if (formData.post_name.trim().length < 3) {
        setError("Name must be at least 3 characters");
        return;
      }

      if (!formData.post_description.trim()) {
        setError("Please tell us about yourself");
        return;
      }

      if (formData.post_description.trim().length < 20) {
        setError("Please write at least 20 characters about yourself");
        return;
      }

      if (selectedImages.length === 0) {
        setError("Please add a photo of yourself");
        return;
      }

      if (!formData.available_hours.trim()) {
        setError("Please select your availability");
        return;
      }

      if (!formData.post_address.trim()) {
        setError("Please enter your location");
        return;
      }
    } else {
      // Standard listing validation
      if (!formData.post_name.trim()) {
        setError("Please enter a title");
        return;
      }

      if (formData.post_name.trim().length < 3) {
        setError("Title must be at least 3 characters");
        return;
      }

      if (!formData.post_description.trim()) {
        setError("Please enter a description");
        return;
      }

      if (formData.post_description.trim().length < 20) {
        setError("Description must be at least 20 characters");
        return;
      }

      if (selectedImages.length === 0) {
        setError("Please add at least one image");
        return;
      }

      if (!formData.available_hours.trim()) {
        setError("Please enter availability hours");
        return;
      }

      if (!formData.post_address.trim()) {
        setError("Please enter an address");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const imageUrls = await uploadImages();

      // Build FormData for Server Action
      const serverFormData = new FormData();
      serverFormData.set("post_name", formData.post_name.trim());
      serverFormData.set("post_description", formData.post_description.trim());
      serverFormData.set("post_type", formData.post_type);
      serverFormData.set("post_address", formData.post_address.trim());
      serverFormData.set("available_hours", formData.available_hours.trim());
      serverFormData.set("transportation", formData.transportation);
      serverFormData.set("images", JSON.stringify(imageUrls));
      serverFormData.set("profile_id", userId);

      // For volunteers, store skills in the condition field
      if (isVolunteerForm && formData.volunteer_skills.length > 0) {
        const skillLabels = formData.volunteer_skills
          .map((skillId) => VOLUNTEER_SKILLS.find((s) => s.id === skillId)?.label)
          .filter(Boolean);
        serverFormData.set("condition", skillLabels.join(","));
      }

      const result = await createProduct(serverFormData);

      if (!result.success) {
        throw new Error(result.error?.message || "Failed to create listing");
      }

      // Redirect to appropriate page
      if (isVolunteerForm) {
        router.push("/volunteers?submitted=true");
      } else {
        router.push(`/food?type=${formData.post_type}`);
      }
      router.refresh();
    } catch (err) {
      console.error("Error creating product:", err);
      setError("Failed to create listing. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleRouteChange = (route: string) => {
    router.push(`/${route}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background dark:from-background dark:to-muted/20">
      <Navbar
        userId={userId}
        isAuth={isAuthenticated}
        isAdmin={isAdmin}
        productType="food"
        onRouteChange={handleRouteChange}
        onProductTypeChange={() => {}}
        imgUrl={avatarUrl || profile?.avatar_url || ""}
        firstName={profile?.first_name || ""}
        secondName={profile?.second_name || ""}
        email={profile?.email || ""}
        signalOfNewMessage={[]}
      />

      {/* Form */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Page Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-bold text-foreground">
            {isVolunteerForm ? "Become a Volunteer" : "Create New Listing"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isVolunteerForm
              ? "Join our community of food heroes making a difference"
              : "Share food items or services with your community"}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="glass rounded-xl p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Category Selection */}
            <div className="mb-6">
              <Label htmlFor="post_type" className="text-base font-semibold mb-2 block">
                {t("category")} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.post_type}
                onValueChange={(value) => handleInputChange("post_type", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">🍎 Food</SelectItem>
                  <SelectItem value="thing">🎁 Things</SelectItem>
                  <SelectItem value="borrow">🔧 Borrow</SelectItem>
                  <SelectItem value="wanted">🤲 Wanted</SelectItem>
                  <SelectItem value="foodbank">🏛️ FoodBanks</SelectItem>
                  <SelectItem value="fridge">❄️ Fridges</SelectItem>
                  <SelectItem value="business">🏛️ Organisations</SelectItem>
                  <SelectItem value="volunteer">🙌 Volunteers</SelectItem>
                  <SelectItem value="challenge">🏆 Challenges</SelectItem>
                  <SelectItem value="zerowaste">♻️ Zero Waste</SelectItem>
                  <SelectItem value="vegan">🌱 Vegan</SelectItem>
                  <SelectItem value="forum">💬 Forum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ============================================
                VOLUNTEER-SPECIFIC FORM FIELDS
                ============================================ */}
            {isVolunteerForm ? (
              <>
                {/* Volunteer Hero Banner */}
                <div className="mb-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-6 text-white text-center">
                  <h2 className="text-2xl font-bold mb-2">Join Our Volunteer Team</h2>
                  <p className="opacity-90">Help us reduce food waste and strengthen communities</p>
                </div>

                {/* Volunteer Photo - Single image */}
                <div className="mb-6">
                  <Label className="text-base font-semibold mb-2 block">
                    Your Photo <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add a friendly photo so the community can get to know you
                  </p>
                  <div className="space-y-4">
                    {imagePreviews.length > 0 ? (
                      <div className="flex justify-center">
                        <div className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs for local previews */}
                          <img
                            src={imagePreviews[0]}
                            alt="Your photo"
                            className="w-32 h-32 object-cover rounded-full border-4 border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(0)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                          id="volunteer-photo-upload"
                        />
                        <label
                          htmlFor="volunteer-photo-upload"
                          className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors bg-emerald-50/50 dark:bg-emerald-950/20"
                        >
                          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-3">
                            <span className="text-3xl">📸</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Click to upload your photo
                          </p>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Volunteer Name/Title */}
                <div className="mb-6">
                  <Label htmlFor="post_name" className="text-base font-semibold mb-2 block">
                    Your Name / Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="post_name"
                    type="text"
                    value={formData.post_name}
                    onChange={(e) => handleInputChange("post_name", e.target.value)}
                    placeholder='e.g., "Sarah M. - Community Food Rescuer"'
                    className="w-full"
                    maxLength={100}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.post_name.length}/100 characters
                  </p>
                </div>

                {/* About Yourself */}
                <div className="mb-6">
                  <Label htmlFor="post_description" className="text-base font-semibold mb-2 block">
                    Tell us about yourself <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="post_description"
                    value={formData.post_description}
                    onChange={(e) => handleInputChange("post_description", e.target.value)}
                    placeholder="Why do you want to volunteer? What skills do you bring? What motivates you to help reduce food waste?"
                    className="w-full min-h-[140px]"
                    maxLength={500}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.post_description.length}/500 characters
                  </p>
                </div>

                {/* Skills Multi-Select */}
                <div className="mb-6">
                  <Label className="text-base font-semibold mb-2 block">
                    Your Skills{" "}
                    <span className="text-muted-foreground font-normal">
                      (select all that apply)
                    </span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {VOLUNTEER_SKILLS.map((skill) => (
                      <div
                        key={skill.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.volunteer_skills.includes(skill.id)
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                            : "border-border hover:border-emerald-300 dark:hover:border-emerald-700"
                        }`}
                        onClick={() => handleSkillToggle(skill.id)}
                      >
                        <Checkbox
                          id={skill.id}
                          checked={formData.volunteer_skills.includes(skill.id)}
                          onCheckedChange={() => handleSkillToggle(skill.id)}
                          className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <label
                          htmlFor={skill.id}
                          className="text-sm font-medium cursor-pointer flex items-center gap-2"
                        >
                          <span>{skill.icon}</span>
                          <span>{skill.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div className="mb-6">
                  <Label className="text-base font-semibold mb-2 block">
                    When are you available? <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={formData.available_hours}
                    onValueChange={(value) => handleInputChange("available_hours", value)}
                    className="grid grid-cols-2 gap-3 mt-3"
                  >
                    {AVAILABILITY_OPTIONS.map((option) => (
                      <div
                        key={option.value}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.available_hours === option.value
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                            : "border-border hover:border-emerald-300 dark:hover:border-emerald-700"
                        }`}
                        onClick={() => handleInputChange("available_hours", option.value)}
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={option.value}
                          className="text-emerald-500"
                        />
                        <label
                          htmlFor={option.value}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Location */}
                <div className="mb-6">
                  <Label htmlFor="post_address" className="text-base font-semibold mb-2 block">
                    Your Location <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="post_address"
                    type="text"
                    value={formData.post_address}
                    onChange={(e) => handleInputChange("post_address", e.target.value)}
                    placeholder="e.g., Sacramento, CA"
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Your exact address won&apos;t be shared - only your general area
                  </p>
                </div>

                {/* Volunteer Submit Section */}
                <div className="pt-4 space-y-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full font-semibold py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Submitting...
                      </span>
                    ) : (
                      "Submit My Volunteer Application"
                    )}
                  </button>
                  <p className="text-center text-sm text-muted-foreground">
                    Your application will be reviewed by our team. We&apos;ll notify you once
                    approved!
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* ============================================
                    STANDARD LISTING FORM FIELDS
                    ============================================ */}

                {/* Title */}
                <div className="mb-6">
                  <Label htmlFor="post_name" className="text-base font-semibold mb-2 block">
                    {t("title")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="post_name"
                    type="text"
                    value={formData.post_name}
                    onChange={(e) => handleInputChange("post_name", e.target.value)}
                    placeholder="e.g., Fresh Homemade Pasta"
                    className="w-full"
                    maxLength={100}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.post_name.length}/100 characters
                  </p>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <Label htmlFor="post_description" className="text-base font-semibold mb-2 block">
                    {t("description")} <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="post_description"
                    value={formData.post_description}
                    onChange={(e) => handleInputChange("post_description", e.target.value)}
                    placeholder="Describe your item in detail..."
                    className="w-full min-h-[120px]"
                    maxLength={500}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.post_description.length}/500 characters
                  </p>
                </div>

                {/* Images */}
                <div className="mb-6">
                  <Label className="text-base font-semibold mb-2 block">
                    {t("photos")} <span className="text-red-500">*</span>
                  </Label>
                  <div className="space-y-4">
                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs for local previews */}
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full aspect-square object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedImages.length < MAX_IMAGES && (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageSelect}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="flex items-center justify-center w-full p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 transition-colors"
                        >
                          <div className="text-center">
                            <span className="text-3xl mb-2 block">📷</span>
                            <p className="text-sm text-muted-foreground">
                              {t("click_to_add_photos", {
                                current: selectedImages.length,
                                max: MAX_IMAGES,
                              })}
                            </p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Available Hours */}
                <div className="mb-6">
                  <Label htmlFor="available_hours" className="text-base font-semibold mb-2 block">
                    {t("available_hours")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="available_hours"
                    type="text"
                    value={formData.available_hours}
                    onChange={(e) => handleInputChange("available_hours", e.target.value)}
                    placeholder="e.g., Weekdays 6-8 PM"
                    className="w-full"
                  />
                </div>

                {/* Transportation */}
                <div className="mb-6">
                  <Label htmlFor="transportation" className="text-base font-semibold mb-2 block">
                    {t("transportation")}
                  </Label>
                  <Select
                    value={formData.transportation}
                    onValueChange={(value) => handleInputChange("transportation", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Pickup Only</SelectItem>
                      <SelectItem value="delivery">Can Deliver</SelectItem>
                      <SelectItem value="both">Both Pickup & Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Address */}
                <div className="mb-6">
                  <Label htmlFor="post_address" className="text-base font-semibold mb-2 block">
                    {t("address")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="post_address"
                    type="text"
                    value={formData.post_address}
                    onChange={(e) => handleInputChange("post_address", e.target.value)}
                    placeholder="Enter your address"
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("your_exact_address_wont_be_shared_publicly")}
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {t("cancel")}
                  </Button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 font-semibold py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span>
                        {t("creating")}
                      </span>
                    ) : (
                      t("create_listing")
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
