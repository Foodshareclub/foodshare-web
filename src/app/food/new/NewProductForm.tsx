"use client";

import { imageAPI } from "@/api/imageAPI";
import { generateListingDraft } from "@/app/actions/ai-draft";
import { createProduct } from "@/app/actions/products";
// Note: Auth state is determined by server-passed userId prop, not useAuth()
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STORAGE_BUCKETS } from "@/constants/storage";
import { LISTING } from "@/constants/validation";
import { resizeImagesForAI } from "@/lib/image/resize-for-ai";
import { useUIStore } from "@/store/zustand/useUIStore";
import {
  Apple,
  ArrowLeft,
  Building2,
  Camera,
  Car,
  ChefHat,
  ClipboardList,
  Code,
  Gift,
  Globe,
  HandHelping,
  HeartHandshake,
  ImagePlus,
  Landmark,
  Leaf,
  Loader2,
  PlusCircle,
  Recycle,
  Refrigerator,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

// Volunteer skills options with Lucide icons
const VOLUNTEER_SKILLS = [
  { id: "driving", label: "Driving/Delivery", Icon: Car },
  { id: "cooking", label: "Cooking", Icon: ChefHat },
  { id: "organizing", label: "Organizing", Icon: ClipboardList },
  { id: "social", label: "Social Media", Icon: Smartphone },
  { id: "photo", label: "Photography", Icon: Camera },
  { id: "translation", label: "Translation", Icon: Globe },
  { id: "tech", label: "Tech/Coding", Icon: Code },
  { id: "outreach", label: "Community Outreach", Icon: HeartHandshake },
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
  /** Initial post type from URL param (e.g., ?type=volunteer) */
  initialType?: string;
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

export function NewProductForm({ userId, initialType = "food" }: NewProductFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { userLocation: _userLocation } = useUIStore();

  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isDrafting, setIsDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    post_name: "",
    post_description: "",
    post_type: initialType,
    available_hours: "",
    transportation: "pickup",
    post_address: "",
    post_stripped_address: "",
    volunteer_skills: [],
  });

  // Sync form state when initialType prop changes (e.g., URL navigation)
  // This replaces the key={initialType} prop that was removed to fix auth issues
  useEffect(() => {
    setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        post_type: initialType,
      }));
    }, 0);
  }, [initialType]);

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

      for (const file of files) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          setError(`Invalid file type: ${file.name}. Please use PNG, JPEG, or WebP.`);
          continue;
        }

        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          setError(`File ${file.name} is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
          continue;
        }

        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }

      setSelectedImages((prev) => [...prev, ...validFiles]);
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    },
    [selectedImages],
  );

  const handleRemoveImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index]);
      return updated;
    });
  }, []);

  const handleAIDraft = useCallback(async () => {
    if (selectedImages.length === 0) {
      setError("Please add at least one image before drafting");
      return;
    }

    setIsDrafting(true);
    setError(null);

    try {
      const base64Images = await resizeImagesForAI(selectedImages);
      const result = await generateListingDraft(base64Images, formData.post_type);

      if (!result.success) {
        setError(result.error?.message || "Failed to generate draft");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        post_name: result.data.title,
        post_description: result.data.description,
      }));
    } catch {
      setError("Failed to generate draft. Please try again.");
    } finally {
      setIsDrafting(false);
    }
  }, [selectedImages, formData.post_type]);

  const uploadImages = async (): Promise<string[]> => {
    const result = await imageAPI.uploadBatch(selectedImages, {
      bucket: STORAGE_BUCKETS.POSTS,
    });

    if (result.error) {
      throw result.error;
    }

    return result.data.results.map((r) => r.data.url);
  };

  const handleSubmit = (e: React.FormEvent) => {
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

      // Photo is optional for volunteers

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

    startSubmitTransition(async () => {
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

        // Redirect to appropriate page based on type
        const redirectMap: Record<string, string> = {
          volunteer: "/volunteer?submitted=true",
          challenge: "/challenge?submitted=true",
        };
        const savedType = result.data.post_type;
        const redirectUrl = redirectMap[savedType] || `/${savedType}`;
        router.push(redirectUrl);
        router.refresh();
      } catch (err) {
        console.error("Error creating product:", err);
        setError("Failed to create listing. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background dark:from-background dark:to-muted/20 py-8">
      {/* Form */}
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Page Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-9 px-3.5 rounded-full border border-border/80 bg-background/80 hover:bg-muted/60 text-foreground transition-all shadow-2xs hover:shadow-xs active:scale-95 inline-flex items-center gap-2 text-xs font-semibold mb-6"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-3.5 mb-2">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-muted/60 border border-border/80 text-foreground shadow-inner">
              <PlusCircle className="size-6 text-brand" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
              {isVolunteerForm ? "Become a Volunteer" : "Create New Listing"}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {isVolunteerForm
              ? "Join our community of food heroes making a difference"
              : "Share food items or services with your community"}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-xl p-6 sm:p-10 space-y-6">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl">
                <p className="text-destructive text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Category Selection */}
            <div>
              <Label htmlFor="post_type" className="text-base font-semibold mb-2 block text-foreground">
                {t("category")} <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.post_type} onValueChange={(value) => handleInputChange("post_type", value)}>
                <SelectTrigger className="w-full h-12 rounded-xl border-border/80 bg-background/60 hover:border-foreground/30 focus:ring-2 focus:ring-primary/20 text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">
                    <span className="flex items-center gap-2">
                      <Apple className="w-4 h-4 text-red-500" />
                      Food
                    </span>
                  </SelectItem>
                  <SelectItem value="thing">
                    <span className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-purple-500" />
                      Things
                    </span>
                  </SelectItem>
                  <SelectItem value="borrow">
                    <span className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-blue-500" />
                      Borrow
                    </span>
                  </SelectItem>
                  <SelectItem value="wanted">
                    <span className="flex items-center gap-2">
                      <HandHelping className="w-4 h-4 text-amber-500" />
                      Wanted
                    </span>
                  </SelectItem>
                  <SelectItem value="fridge">
                    <span className="flex items-center gap-2">
                      <Refrigerator className="w-4 h-4 text-cyan-500" />
                      Fridges
                    </span>
                  </SelectItem>
                  <SelectItem value="foodbank">
                    <span className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-indigo-500" />
                      Food Banks
                    </span>
                  </SelectItem>
                  <SelectItem value="business">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      Organisations
                    </span>
                  </SelectItem>
                  <SelectItem value="volunteer">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-500" />
                      Volunteers
                    </span>
                  </SelectItem>
                  <SelectItem value="challenge">
                    <span className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      Challenges
                    </span>
                  </SelectItem>
                  <SelectItem value="zerowaste">
                    <span className="flex items-center gap-2">
                      <Recycle className="w-4 h-4 text-green-500" />
                      Zero Waste
                    </span>
                  </SelectItem>
                  <SelectItem value="vegan">
                    <span className="flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-lime-500" />
                      Vegan
                    </span>
                  </SelectItem>
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

                {/* Volunteer Photo - Single image (optional) */}
                <div className="mb-6">
                  <Label className="text-base font-semibold mb-2 block">
                    Your Photo <span className="text-muted-foreground font-normal">(Optional)</span>
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
                            alt="Your profile preview"
                            className="w-32 h-32 object-cover rounded-full border-4 border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(0)}
                            className="absolute -top-1 -end-1 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
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
                            <Camera className="w-8 h-8 text-emerald-600" />
                          </div>
                          <p className="text-sm text-muted-foreground">Click to upload your photo</p>
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
                    maxLength={LISTING.title.maxLength}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.post_name.length}/{LISTING.title.maxLength} characters
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
                    maxLength={LISTING.description.maxLength}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.post_description.length}/{LISTING.description.maxLength} characters
                  </p>
                </div>

                {/* Skills Multi-Select */}
                <div className="mb-6">
                  <Label className="text-base font-semibold mb-2 block">
                    Your Skills <span className="text-muted-foreground font-normal">(select all that apply)</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {VOLUNTEER_SKILLS.map((skill) => (
                      <label
                        htmlFor={skill.id}
                        key={skill.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.volunteer_skills.includes(skill.id)
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                            : "border-border hover:border-emerald-300 dark:hover:border-emerald-700"
                        }`}
                      >
                        <Checkbox
                          id={skill.id}
                          checked={formData.volunteer_skills.includes(skill.id)}
                          onCheckedChange={() => handleSkillToggle(skill.id)}
                          className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <span className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <skill.Icon className="w-4 h-4 text-emerald-600" />
                          <span>{skill.label}</span>
                        </span>
                      </label>
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
                      <label
                        htmlFor={option.value}
                        key={option.value}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.available_hours === option.value
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                            : "border-border hover:border-emerald-300 dark:hover:border-emerald-700"
                        }`}
                      >
                        <RadioGroupItem value={option.value} id={option.value} className="text-emerald-500" />
                        <span className="text-sm font-medium cursor-pointer">{option.label}</span>
                      </label>
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
                    className="w-full h-12 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#FF2D55] to-[#FF385C] hover:from-[#E02447] hover:to-[#E0284D] active:scale-95 text-white shadow-md hover:shadow-lg shadow-[#FF2D55]/20 hover:shadow-[#FF2D55]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      "Submit My Volunteer Application"
                    )}
                  </button>
                  <p className="text-center text-sm text-muted-foreground">
                    Your application will be reviewed by our team. We&apos;ll notify you once approved!
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl border-border/80 bg-background/80 hover:bg-muted/60 text-foreground font-semibold text-sm active:scale-95 transition-all"
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

                {/* Images (first — eBay-style flow) */}
                <div className="mb-6">
                  <Label className="text-base font-semibold mb-2 block text-foreground">
                    {t("photos")} <span className="text-destructive">*</span>
                  </Label>
                  <div className="space-y-4">
                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {imagePreviews.map((preview, index) => (
                          <div
                            key={preview}
                            className="relative group rounded-2xl overflow-hidden border border-border/80 shadow-xs hover:shadow-md transition-all"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs for local previews */}
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full aspect-square object-cover"
                            />
                            {index === 0 && (
                              <span className="absolute bottom-2 start-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-black/75 text-white backdrop-blur-xs shadow-xs">
                                {"Cover photo"}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-2 end-2 size-7 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                            >
                              <X className="size-3.5" />
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
                          className="flex flex-col items-center justify-center w-full p-8 sm:p-10 border-2 border-dashed border-border/80 hover:border-foreground/40 rounded-2xl cursor-pointer hover:bg-muted/30 transition-all text-center"
                        >
                          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-foreground mb-3 shadow-inner">
                            <ImagePlus className="size-7" />
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {t("click_to_add_photos", {
                              current: selectedImages.length,
                              max: MAX_IMAGES,
                            })}
                          </p>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Draft Button */}
                {selectedImages.length > 0 && (
                  <div className="mb-6">
                    <button
                      type="button"
                      onClick={handleAIDraft}
                      disabled={isDrafting}
                      className="h-10 px-4 rounded-full border border-border/80 bg-background/80 hover:bg-muted/60 hover:border-foreground/30 text-foreground text-xs font-semibold shadow-2xs hover:shadow-xs active:scale-95 transition-all inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDrafting ? (
                        <>
                          <Loader2 className="size-4 animate-spin text-brand" />
                          <span>Analyzing images...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Draft with AI</span>
                        </>
                      )}
                    </button>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      AI will suggest a title and description based on your photos
                    </p>
                  </div>
                )}

                {/* Title */}
                <div className="mb-6">
                  <Label htmlFor="post_name" className="text-base font-semibold mb-2 block text-foreground">
                    {t("title")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="post_name"
                    type="text"
                    value={formData.post_name}
                    onChange={(e) => handleInputChange("post_name", e.target.value)}
                    placeholder="e.g., Fresh Homemade Pasta"
                    className="w-full h-12 rounded-xl border-border/80 bg-background/60 hover:border-foreground/30 focus:border-[#FF2D55] focus:ring-2 focus:ring-[#FF2D55]/20 text-sm"
                    maxLength={LISTING.title.maxLength}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.post_name.length}/{LISTING.title.maxLength} characters
                  </p>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <Label htmlFor="post_description" className="text-base font-semibold mb-2 block text-foreground">
                    {t("description")} <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="post_description"
                    value={formData.post_description}
                    onChange={(e) => handleInputChange("post_description", e.target.value)}
                    placeholder="Describe your item in detail..."
                    className="w-full min-h-[120px] rounded-xl border-border/80 bg-background/60 hover:border-foreground/30 focus:border-[#FF2D55] focus:ring-2 focus:ring-[#FF2D55]/20 text-sm p-3.5"
                    maxLength={LISTING.description.maxLength}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.post_description.length}/{LISTING.description.maxLength} characters
                  </p>
                </div>

                {/* Available Hours */}
                <div className="mb-6">
                  <Label htmlFor="available_hours" className="text-base font-semibold mb-2 block text-foreground">
                    {t("available_hours")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="available_hours"
                    type="text"
                    value={formData.available_hours}
                    onChange={(e) => handleInputChange("available_hours", e.target.value)}
                    placeholder="e.g., Weekdays 6-8 PM"
                    className="w-full h-12 rounded-xl border-border/80 bg-background/60 hover:border-foreground/30 focus:border-[#FF2D55] focus:ring-2 focus:ring-[#FF2D55]/20 text-sm"
                  />
                </div>

                {/* Transportation */}
                <div className="mb-6">
                  <Label htmlFor="transportation" className="text-base font-semibold mb-2 block text-foreground">
                    {t("transportation")}
                  </Label>
                  <Select
                    value={formData.transportation}
                    onValueChange={(value) => handleInputChange("transportation", value)}
                  >
                    <SelectTrigger className="w-full h-12 rounded-xl border-border/80 bg-background/60 hover:border-foreground/30 focus:ring-2 focus:ring-primary/20 text-sm">
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
                  <Label htmlFor="post_address" className="text-base font-semibold mb-2 block text-foreground">
                    {t("address")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="post_address"
                    type="text"
                    value={formData.post_address}
                    onChange={(e) => handleInputChange("post_address", e.target.value)}
                    placeholder="Enter your address"
                    className="w-full h-12 rounded-xl border-border/80 bg-background/60 hover:border-foreground/30 focus:border-[#FF2D55] focus:ring-2 focus:ring-[#FF2D55]/20 text-sm"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("your_exact_address_wont_be_shared_publicly")}
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-border/40">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-xl border-border/80 bg-background/80 hover:bg-muted/60 hover:border-foreground/30 text-foreground font-semibold text-sm active:scale-95 transition-all"
                  >
                    {t("cancel")}
                  </Button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#FF2D55] to-[#FF385C] hover:from-[#E02447] hover:to-[#E0284D] active:scale-95 text-white shadow-md hover:shadow-lg shadow-[#FF2D55]/20 hover:shadow-[#FF2D55]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
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
