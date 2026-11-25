"use client";

import { imageAPI } from "@/api/imageAPI";
import { generateListingDraft } from "@/app/actions/ai-draft";
import { createProduct } from "@/app/actions/products";
import { STORAGE_BUCKETS } from "@/constants/storage";
import { resizeImagesForAI } from "@/lib/image/resize-for-ai";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { ListingTypeSelect } from "./components/ListingTypeSelect";
import { StandardListingFields } from "./components/StandardListingFields";
import { VolunteerApplicationFields } from "./components/VolunteerApplicationFields";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_MB,
  MAX_IMAGES,
  type NewListingFormData,
  VOLUNTEER_SKILLS,
} from "./components/types";

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

const FORM_COPY = {
  back: "Back",
  volunteerTitle: "Become a Volunteer",
  listingTitle: "Create New Listing",
  volunteerSubtitle: "Join our community of food heroes making a difference",
  listingSubtitle: "Share food items or services with your community",
} as const;

function validateNewListing(formData: NewListingFormData, selectedImagesCount: number): string | null {
  const isVolunteer = formData.post_type === "volunteer";
  const name = formData.post_name.trim();
  const description = formData.post_description.trim();

  if (!name) return isVolunteer ? "Please enter your name/title" : "Please enter a title";
  if (name.length < 3)
    return isVolunteer ? "Name must be at least 3 characters" : "Title must be at least 3 characters";
  if (!description) return isVolunteer ? "Please tell us about yourself" : "Please enter a description";
  if (description.length < 20) {
    return isVolunteer
      ? "Please write at least 20 characters about yourself"
      : "Description must be at least 20 characters";
  }
  if (!isVolunteer && selectedImagesCount === 0) return "Please add at least one image";
  if (!formData.available_hours.trim()) {
    return isVolunteer ? "Please select your availability" : "Please enter availability hours";
  }
  if (!formData.post_address.trim()) return isVolunteer ? "Please enter your location" : "Please enter an address";
  return null;
}

export function NewProductForm({ userId, initialType = "food" }: NewProductFormProps) {
  const router = useRouter();

  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isDrafting, setIsDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState<NewListingFormData>({
    post_name: "",
    post_description: "",
    post_type: initialType,
    available_hours: "",
    transportation: "pickup",
    post_address: "",
    post_stripped_address: "",
    volunteer_skills: [],
  });

  useEffect(() => {
    setFormData((prev) => (prev.post_type === initialType ? prev : { ...prev, post_type: initialType }));
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

  const handleInputChange = (field: keyof NewListingFormData, value: string) => {
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
      const target = prev[index];
      if (target) URL.revokeObjectURL(target);
      return prev.filter((_, i) => i !== index);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateNewListing(formData, selectedImages.length);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    startSubmitTransition(async () => {
      try {
        const uploadResult = await imageAPI.uploadBatch(selectedImages, {
          bucket: STORAGE_BUCKETS.POSTS,
        });
        if (uploadResult.error) {
          throw uploadResult.error;
        }
        const imageUrls = uploadResult.data.results.map((r) => r.data.url);

        const serverFormData = new FormData();
        serverFormData.set("post_name", formData.post_name.trim());
        serverFormData.set("post_description", formData.post_description.trim());
        serverFormData.set("post_type", formData.post_type);
        serverFormData.set("post_address", formData.post_address.trim());
        serverFormData.set("available_hours", formData.available_hours.trim());
        serverFormData.set("transportation", formData.transportation);
        serverFormData.set("images", JSON.stringify(imageUrls));
        serverFormData.set("profile_id", userId);

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

        const redirectMap: Record<string, string> = {
          volunteer: "/volunteer?submitted=true",
          challenge: "/challenge?submitted=true",
        };
        const savedType = result.data.post_type;
        router.push(redirectMap[savedType] || `/${savedType}`);
        router.refresh();
      } catch (err) {
        console.error("Error creating product:", err);
        setError("Failed to create listing. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background dark:from-background dark:to-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-9 px-3.5 rounded-full border border-border/80 bg-background/80 hover:bg-muted/60 text-foreground transition-all shadow-2xs hover:shadow-xs active:scale-95 inline-flex items-center gap-2 text-xs font-semibold mb-6"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>{FORM_COPY.back}</span>
          </button>
          <div className="flex items-center gap-3.5 mb-2">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-muted/60 border border-border/80 text-foreground shadow-inner">
              <PlusCircle className="size-6 text-brand" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
              {isVolunteerForm ? FORM_COPY.volunteerTitle : FORM_COPY.listingTitle}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {isVolunteerForm ? FORM_COPY.volunteerSubtitle : FORM_COPY.listingSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-xl p-6 sm:p-10 space-y-6">
            {error && (
              <div role="alert" className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl">
                <p className="text-destructive text-sm font-medium">{error}</p>
              </div>
            )}

            <ListingTypeSelect value={formData.post_type} onChange={(value) => handleInputChange("post_type", value)} />

            {isVolunteerForm ? (
              <VolunteerApplicationFields
                formData={formData}
                imagePreviews={imagePreviews}
                isSubmitting={isSubmitting}
                onInputChange={handleInputChange}
                onSkillToggle={handleSkillToggle}
                onImageSelect={handleImageSelect}
                onRemoveImage={handleRemoveImage}
                onCancel={() => router.back()}
              />
            ) : (
              <StandardListingFields
                formData={formData}
                selectedImagesCount={selectedImages.length}
                imagePreviews={imagePreviews}
                isDrafting={isDrafting}
                isSubmitting={isSubmitting}
                onInputChange={handleInputChange}
                onImageSelect={handleImageSelect}
                onRemoveImage={handleRemoveImage}
                onAIDraft={handleAIDraft}
                onCancel={() => router.back()}
              />
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
