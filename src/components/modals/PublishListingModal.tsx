"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Loader2,
  Calendar,
  CalendarDays,
  BarChart3,
  CheckCircle,
  Clock,
  MessageCircle,
  AlertCircle,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Hash,
  Info,
  Leaf,
  MapPin,
  Plus,
  RotateCw,
  Save,
  ZoomIn,
  Star,
  Tag,
  Terminal,
  Train,
  Trash2,
  Undo2,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { PublishListingModalType } from "./publish-listing/types";
import {
  categoryConfig,
  dietaryOptions,
  conditionOptions,
  contactOptions,
  MAX_DESCRIPTION_LENGTH,
  MAX_IMAGES,
  MAX_TAGS,
} from "./publish-listing/constants";
import {
  Confetti,
  ProgressBar,
  QualityScore,
  ImageLightbox,
  TagInput,
  CollapsibleSection,
  VoiceInput,
  TemplatePicker,
  TitleSuggestions,
  AriaAnnouncer,
  SmartTips,
} from "./publish-listing/components";
import { useImageUpload, useListingForm, useUndoRedo } from "./publish-listing/hooks";
import { RequiredStar } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { createProduct, updateProduct } from "@/app/actions/products";
import { useUIStore } from "@/store/zustand/useUIStore";
import { storageAPI } from "@/api/storageAPI";
import type { InitialProductStateType } from "@/types/product.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { STORAGE_BUCKETS, getStorageUrl } from "@/constants/storage";
import { ALLOWED_MIME_TYPES } from "@/constants/mime-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Extracted components, utilities, and hooks

/**
 * PublishListingModal Component
 * Modal for creating and editing product listings
 * Refactored to use custom hooks for cleaner architecture
 */
function PublishListingModal({
  product,
  isOpen,
  onClose,
  setOpenEdit,
  value,
}: PublishListingModalType) {
  const _t = useTranslations();
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);

  // Auth and location state
  const { user } = useAuth();
  const id = user?.id;
  const { userLocation } = useUIStore();

  const productId = product?.id || 0;

  // Image upload hook
  const imageUpload = useImageUpload({
    onImageAdded: () => form.setTouched((prev) => ({ ...prev, image: true })),
  });

  // Form state hook
  const form = useListingForm({
    isOpen,
    initialCategory: value || "",
    imageCount: imageUpload.images.length,
  });

  // Undo/Redo hook
  const undoRedo = useUndoRedo({
    title: form.formData.title,
    description: form.formData.description,
    onUndo: (state) => {
      form.setTitle(state.title);
      form.setDescription(state.description);
    },
    onRedo: (state) => {
      form.setTitle(state.title);
      form.setDescription(state.description);
    },
    isOpen,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [publishState, setPublishState] = useState<"idle" | "loading" | "success">("idle");
  const [shakeError, setShakeError] = useState(false);
  const [showQualityScore, setShowQualityScore] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (product) {
        imageUpload.initializeFromProduct(product.images || []);
        form.initializeFromProduct(product);
      } else {
        imageUpload.clearImages();
        form.resetForm(value || "");
      }
      setShowPreview(false);
      setPublishState("idle");
      setShakeError(false);
      setShowQualityScore(false);
      setShowTips(true);
      setLightboxIndex(null);
      setShowTemplates(false);
      setError(null);
      setUploadProgress(null);
      undoRedo.clearHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product, value]);

  // Keyboard shortcut for publish
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && isOpen && !isLoading) {
        e.preventDefault();
        publishHandler();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isLoading]);

  // Voice input handler
  const handleVoiceTranscript = (transcript: string) => {
    const currentDesc = form.formData.description;
    const newDesc = currentDesc ? `${currentDesc} ${transcript}` : transcript;
    form.setDescription(newDesc.slice(0, MAX_DESCRIPTION_LENGTH));
  };

  // Template selection handler
  const handleTemplateSelect = (template: {
    title: string;
    description: string;
    tags: string[];
  }) => {
    const currentTitle = form.formData.title;
    form.setTitle(template.title + (currentTitle || ""));
    form.setDescription(template.description);
    form.setTags(template.tags);
    setShowTemplates(false);
  };

  // Build product object for submission
  const imagesArray = imageUpload.images
    .map((img) => {
      if (img.isExisting) return img.url;
      if (img.filePath) return getStorageUrl(STORAGE_BUCKETS.POSTS, `${id}/${img.filePath}`);
      return null;
    })
    .filter((url): url is string => url !== null);

  const productObj: Partial<InitialProductStateType> = (() => {
    const obj: Partial<InitialProductStateType> = {
      images: imagesArray,
      post_type: form.formData.category,
      post_name: form.formData.title,
      post_description: form.formData.description,
      available_hours: form.formData.time,
      post_stripped_address: form.formData.address,
      transportation: form.formData.metroStation,
      condition: form.formData.condition || "",
      profile_id: id,
      location: userLocation
        ? `SRID=4326;POINT(${userLocation.longitude} ${userLocation.latitude})`
        : undefined,
    };

    if (product && imageUpload.images[0]?.isExisting) {
      obj.images = product.images?.length > 0 ? product.images : imagesArray;
    }

    return obj;
  })();

  // Publish handler
  const publishHandler = async () => {
    form.touchAll();

    if (!form.isFormValid || imageUpload.images.length === 0) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      formRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Clear previous errors
    setError(null);
    setUploadProgress(null);

    // Pre-flight checks
    if (!id) {
      setError("Please sign in to publish a listing");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }

    // Check network connectivity
    if (!navigator.onLine) {
      setError("No internet connection. Please check your network and try again.");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }

    setIsLoading(true);
    setPublishState("loading");

    try {
      // Upload images in parallel with retry logic
      const imagesToUpload = imageUpload.images.filter((image) => image.file && image.filePath);

      if (imagesToUpload.length > 0) {
        setUploadProgress(`Uploading ${imagesToUpload.length} image(s)...`);

        // Upload with retry wrapper
        const uploadWithRetry = async (
          image: (typeof imagesToUpload)[0],
          retries = 2
        ): Promise<{ success: boolean; error?: string }> => {
          for (let attempt = 0; attempt <= retries; attempt++) {
            try {
              const result = await storageAPI.uploadImage({
                bucket: STORAGE_BUCKETS.POSTS,
                file: image.file!,
                filePath: `${id}/${image.filePath}`,
              });

              if (result.error) {
                if (attempt === retries) {
                  return { success: false, error: result.error.message };
                }
                // Wait before retry (exponential backoff)
                await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
                continue;
              }

              return { success: true };
            } catch (err) {
              if (attempt === retries) {
                return {
                  success: false,
                  error: err instanceof Error ? err.message : "Upload failed",
                };
              }
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            }
          }
          return { success: false, error: "Upload failed after retries" };
        };

        const uploadResults = await Promise.all(imagesToUpload.map((img) => uploadWithRetry(img)));

        const failedUploads = uploadResults.filter((r) => !r.success);
        if (failedUploads.length > 0) {
          const errorMessages = failedUploads.map((f) => f.error).filter(Boolean);
          console.error("[PublishListing] Image upload errors:", errorMessages);
          throw new Error(
            failedUploads.length === imagesToUpload.length
              ? "Failed to upload images. Please try again."
              : `Failed to upload ${failedUploads.length} of ${imagesToUpload.length} image(s)`
          );
        }
      }

      setUploadProgress("Saving listing...");

      // Build form data for server action
      const formData = new FormData();
      formData.set("post_name", (productObj.post_name || "").trim());
      formData.set("post_description", (productObj.post_description || "").trim());
      formData.set("post_type", productObj.post_type || "");
      formData.set("post_address", (productObj.post_stripped_address || "").trim());
      if (productObj.available_hours) formData.set("available_hours", productObj.available_hours);
      if (productObj.transportation) formData.set("transportation", productObj.transportation);
      if (productObj.condition) formData.set("condition", productObj.condition);
      if (productObj.images) formData.set("images", JSON.stringify(productObj.images));
      if (productObj.profile_id) formData.set("profile_id", productObj.profile_id);

      // Create or update with timeout protection
      const timeoutMs = 30000; // 30 second timeout
      let result;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out. Please try again.")), timeoutMs)
      );

      if (product) {
        formData.set("is_active", "true");
        result = await Promise.race([updateProduct(productId, formData), timeoutPromise]);
      } else {
        result = await Promise.race([createProduct(formData), timeoutPromise]);
        if (result.success) form.clearDraft();
      }

      if (!result.success) {
        const errorMsg = result.error?.message || "Failed to save listing";
        console.error("[PublishListing] Save failed:", result.error);
        throw new Error(errorMsg);
      }

      // Success - refresh and close
      setUploadProgress(null);
      router.refresh();
      setPublishState("success");

      // Brief delay to show success state
      await new Promise((resolve) => setTimeout(resolve, 1500));

      onClose();
      setOpenEdit?.(false);
    } catch (err) {
      console.error("[PublishListing] Publish error:", err);

      // User-friendly error messages
      let errorMessage = "Failed to publish listing";
      if (err instanceof Error) {
        if (err.message.includes("timed out")) {
          errorMessage = "Request timed out. Please check your connection and try again.";
        } else if (err.message.includes("network") || err.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (err.message.includes("unauthorized") || err.message.includes("auth")) {
          errorMessage = "Session expired. Please sign in again.";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setUploadProgress(null);
      setPublishState("idle");
    } finally {
      setIsLoading(false);
    }
  };

  const onDialogOpenChange = (open: boolean) => {
    if (!open && publishState !== "loading") {
      onClose();
      setOpenEdit?.(false);
    }
  };

  const showImageError = form.touched.image && imageUpload.images.length === 0;
  const selectedCategory = form.formData.category as keyof typeof categoryConfig;
  const categoryData = selectedCategory ? categoryConfig[selectedCategory] : null;
  const CategoryIcon = categoryData?.icon;
  const titlePlaceholder = categoryData?.placeholders?.title || "What is it called";
  const descriptionPlaceholder = categoryData?.placeholders?.description || "A few words about...";
  const primaryImageUrl = imageUpload.images[0]?.url || "";

  // Success state
  if (publishState === "success") {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent variant="glass" className="max-w-md">
          <Confetti />
          <div className="flex flex-col items-center justify-center py-12 text-center relative z-10">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-green-400/30" />
              <div className="relative p-4 rounded-full bg-green-500/20">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <h3 className="mt-6 text-xl font-semibold">
              {product ? "Listing Updated!" : "Listing Published!"}
            </h3>
            <p className="mt-2 text-muted-foreground">
              {form.formData.scheduledDate
                ? "Your listing is scheduled"
                : "Your listing is now live"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onDialogOpenChange}>
      <DialogContent
        variant="glass"
        className="max-w-md md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0">
          <ProgressBar progress={form.progress} />
        </div>

        <DialogHeader className="flex-shrink-0 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                {product ? "Edit Listing" : "Create New Listing"}
                {form.progress === 100 && (
                  <CheckCircle className="h-5 w-5 text-green-500 animate-in zoom-in duration-200" />
                )}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {product
                  ? "Update your listing details below"
                  : "Share something with your community"}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowQualityScore(!showQualityScore)}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">{form.qualityScore.score}</span>
              </Button>
              {form.isFormValid && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="hidden sm:inline">{showPreview ? "Hide" : "Preview"}</span>
                </Button>
              )}
            </div>
          </div>

          {showQualityScore && (
            <div className="mt-3">
              <QualityScore
                score={form.qualityScore.score}
                suggestions={form.qualityScore.suggestions}
                onClose={() => setShowQualityScore(false)}
              />
            </div>
          )}

          {/* Draft notification */}
          {!product && form.hasDraft && !form.formData.title && !form.formData.description && (
            <div className="mt-3 p-3 rounded-lg bg-muted/50 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">You have a saved draft</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={form.loadDraft} className="h-7 px-2">
                  Restore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={form.clearDraft}
                  className="h-7 px-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-destructive font-medium">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="h-6 w-6 p-0 text-destructive/70 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Upload progress indicator */}
          {uploadProgress && (
            <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
              <span className="text-primary">{uploadProgress}</span>
            </div>
          )}
        </DialogHeader>

        <div
          ref={formRef}
          className={`flex-1 overflow-y-auto overscroll-contain -mx-6 px-6 ${shakeError ? "animate-shake" : ""}`}
          style={{ scrollbarGutter: "stable" }}
        >
          <style>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                20%, 40%, 60%, 80% { transform: translateX(4px); }
              }
              .animate-shake { animation: shake 0.5s ease-in-out; }
            `}</style>

          <div className={`grid gap-6 py-2 ${showPreview ? "md:grid-cols-2" : "grid-cols-1"}`}>
            {/* Form Section */}
            <div className="space-y-5">
              <AriaAnnouncer message={undoRedo.ariaMessage} />

              {/* Quick Actions Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-1.5"
                  disabled={!form.formData.category}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Templates
                </Button>

                {(undoRedo.canUndo || undoRedo.canRedo) && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={undoRedo.handleUndo}
                      disabled={!undoRedo.canUndo}
                      className="h-8 w-8 p-0"
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={undoRedo.handleRedo}
                      disabled={!undoRedo.canRedo}
                      className="h-8 w-8 p-0"
                      title="Redo (Ctrl+Shift+Z)"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {showTemplates && form.formData.category && (
                <TemplatePicker
                  category={form.formData.category}
                  onSelect={handleTemplateSelect}
                  onClose={() => setShowTemplates(false)}
                />
              )}

              {showTips && categoryData?.tips && !showTemplates && (
                <SmartTips tips={[...categoryData.tips]} onDismiss={() => setShowTips(false)} />
              )}

              {/* Multi-Image Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Photos
                  <RequiredStar />
                  <span className="text-xs text-muted-foreground ml-1">
                    ({imageUpload.images.length}/{MAX_IMAGES})
                  </span>
                </Label>

                <div className="grid grid-cols-4 gap-2">
                  {imageUpload.images.map((image, index) => (
                    <div
                      key={image.id}
                      draggable
                      onDragStart={() => imageUpload.handleImageDragStart(image.id)}
                      onDragOver={(e) => imageUpload.handleImageDragOver(e, image.id)}
                      onDragEnd={imageUpload.handleImageDragEnd}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 group cursor-move
                          ${index === 0 ? "col-span-2 row-span-2" : ""}
                          ${imageUpload.draggedImageId === image.id ? "opacity-50 border-primary" : "border-transparent"}
                        `}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={`Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                      {index === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-medium rounded">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        className="absolute top-1 left-1/2 -translate-x-1/2 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ZoomIn className="h-3 w-3 text-white" />
                      </button>
                      <div className="absolute top-1 right-8 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-3 w-3 text-white" />
                      </div>
                      <button
                        type="button"
                        onClick={() => imageUpload.removeImage(image.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {imageUpload.images.length < MAX_IMAGES && (
                    <div
                      onClick={imageUpload.onFileInputClick}
                      onDrop={imageUpload.handleDrop}
                      onDragOver={imageUpload.handleDragOver}
                      onDragLeave={imageUpload.handleDragLeave}
                      role="button"
                      tabIndex={0}
                      aria-label="Add image"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          imageUpload.onFileInputClick();
                        }
                      }}
                      className={`
                          aspect-square rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer
                          flex flex-col items-center justify-center gap-1
                          ${imageUpload.images.length === 0 ? "col-span-2 row-span-2" : ""}
                          ${imageUpload.isDragOver ? "border-primary bg-primary/5 scale-[1.02]" : ""}
                          ${showImageError ? "border-destructive bg-destructive/5" : ""}
                          ${!imageUpload.isDragOver && !showImageError ? "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50" : ""}
                        `}
                    >
                      {imageUpload.isCompressing ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      ) : (
                        <>
                          <Plus
                            className={`h-6 w-6 ${showImageError ? "text-destructive" : "text-muted-foreground"}`}
                          />
                          {imageUpload.images.length === 0 && (
                            <span className="text-xs text-muted-foreground text-center px-2">
                              Drop images or click
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <input
                  className="hidden"
                  accept={ALLOWED_MIME_TYPES.POSTS.join(",")}
                  ref={imageUpload.inputFileRef}
                  type="file"
                  multiple
                  onChange={imageUpload.handleChangeFile}
                />

                {imageUpload.imageError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {imageUpload.imageError}
                  </p>
                )}
                {showImageError && !imageUpload.imageError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Please add at least one photo
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Drag to reorder. First image will be the cover.
                </p>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Category
                  <RequiredStar />
                </Label>
                <Select
                  value={form.formData.category}
                  onValueChange={(val: string) => {
                    form.setCategory(val);
                    setShowTips(true);
                  }}
                >
                  <SelectTrigger
                    variant="glass"
                    className={form.showCategoryError ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${config.color}`} />
                            {config.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {form.showCategoryError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Please select a category
                  </p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="listing-title" className="flex items-center gap-1">
                  Title
                  <RequiredStar />
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="listing-title"
                    className={`capitalize flex-1 ${form.showTitleError ? "border-destructive" : ""}`}
                    value={form.formData.title}
                    onChange={(e) => form.setTitle(e.target.value)}
                    onBlur={() => form.setTouched((prev) => ({ ...prev, title: true }))}
                    placeholder={titlePlaceholder}
                    aria-describedby={form.showTitleError ? "title-error" : undefined}
                  />
                  <TitleSuggestions
                    category={form.formData.category}
                    onSelect={form.setTitle}
                    currentTitle={form.formData.title}
                  />
                </div>
                {form.showTitleError && (
                  <p
                    id="title-error"
                    className="text-xs text-destructive flex items-center gap-1"
                    role="alert"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Please enter a title
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="listing-description" className="flex items-center gap-1">
                    Description
                    <RequiredStar />
                  </Label>
                  <div className="flex items-center gap-2">
                    <VoiceInput
                      onTranscript={handleVoiceTranscript}
                      disabled={form.formData.description.length >= MAX_DESCRIPTION_LENGTH}
                    />
                    <span
                      className={`text-xs tabular-nums transition-colors ${
                        form.formData.description.length > MAX_DESCRIPTION_LENGTH * 0.9
                          ? "text-orange-500 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {form.formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                    </span>
                  </div>
                </div>
                <Textarea
                  id="listing-description"
                  value={form.formData.description}
                  onChange={(e) => {
                    // Truncate to max length instead of rejecting the entire input
                    const value = e.target.value.slice(0, MAX_DESCRIPTION_LENGTH);
                    form.setDescription(value);
                  }}
                  onBlur={() => form.setTouched((prev) => ({ ...prev, description: true }))}
                  placeholder={descriptionPlaceholder}
                  className={`min-h-[100px] resize-none ${form.showDescriptionError ? "border-destructive" : ""}`}
                  aria-describedby={form.showDescriptionError ? "description-error" : undefined}
                />
                {form.showDescriptionError && (
                  <p
                    id="description-error"
                    className="text-xs text-destructive flex items-center gap-1"
                    role="alert"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Please add a description
                  </p>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  Tags
                </Label>
                <TagInput
                  tags={form.formData.tags}
                  onTagsChange={form.setTags}
                  maxTags={MAX_TAGS}
                />
              </div>

              {/* Category-specific fields */}
              {categoryData && (categoryData.hasQuantity || categoryData.hasExpiration) && (
                <div className="grid grid-cols-2 gap-4">
                  {categoryData.hasQuantity && (
                    <div className="space-y-2">
                      <Label htmlFor="listing-quantity" className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                        Quantity
                      </Label>
                      <Input
                        id="listing-quantity"
                        value={form.formData.quantity}
                        onChange={(e) => form.setQuantity(e.target.value)}
                        placeholder="e.g., 3 portions"
                      />
                    </div>
                  )}
                  {categoryData.hasExpiration && (
                    <div className="space-y-2">
                      <Label htmlFor="listing-expiration" className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        Best Before
                      </Label>
                      <Input
                        id="listing-expiration"
                        type="date"
                        value={form.formData.expirationDate}
                        onChange={(e) => form.setExpirationDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Dietary Labels (for food) */}
              {categoryData?.hasDietary && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Leaf className="h-3.5 w-3.5 text-muted-foreground" />
                    Dietary Info
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {dietaryOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = form.formData.dietaryLabels.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => form.toggleDietaryLabel(option.id)}
                          className={`
                              inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all
                              ${isSelected ? `${option.color} bg-current/10 ring-1 ring-current/30` : "text-muted-foreground bg-muted hover:bg-muted/80"}
                            `}
                        >
                          <Icon className="h-3 w-3" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Condition (for things/borrow) */}
              {categoryData?.hasCondition && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-muted-foreground" />
                    Condition
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {conditionOptions.map((option) => {
                      const isSelected = form.formData.condition === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => form.setCondition(option.id)}
                          className={`
                              flex flex-col items-start p-2.5 rounded-lg text-left transition-all border
                              ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                            `}
                        >
                          <span
                            className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}
                          >
                            {option.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Fields Section */}
              <CollapsibleSection
                title="Additional Details"
                icon={<Plus className="h-4 w-4 text-muted-foreground" />}
              >
                <div className="space-y-2">
                  <Label htmlFor="listing-time" className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Available Time
                  </Label>
                  <Input
                    id="listing-time"
                    value={form.formData.time}
                    onChange={(e) => form.setTime(e.target.value)}
                    placeholder="e.g., Weekdays 6-8 PM"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="listing-address" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      Address
                    </Label>
                    <Input
                      id="listing-address"
                      className="capitalize"
                      value={form.formData.address}
                      onChange={(e) => form.setAddress(e.target.value)}
                      placeholder="Where you will be"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listing-metro" className="flex items-center gap-1.5">
                      <Train className="h-3.5 w-3.5 text-muted-foreground" />
                      Metro Station
                    </Label>
                    <Input
                      id="listing-metro"
                      value={form.formData.metroStation}
                      onChange={(e) => form.setMetroStation(e.target.value)}
                      placeholder="Nearest station"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    Contact Preference
                  </Label>
                  <div className="flex gap-2">
                    {contactOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = form.formData.contactPreferences.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => form.toggleContactPreference(option.id)}
                          className={`
                              flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border
                              ${isSelected ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"}
                            `}
                        >
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleSection>

              {/* Scheduled Publishing */}
              <CollapsibleSection
                title="Schedule Publishing"
                icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
                badge={form.formData.scheduledDate ? "Scheduled" : undefined}
              >
                <div className="p-3 rounded-lg bg-muted/30 mb-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Schedule your listing to go live at a specific date and time. Leave empty to
                      publish immediately.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-date" className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Date
                    </Label>
                    <Input
                      id="scheduled-date"
                      type="date"
                      value={form.formData.scheduledDate}
                      onChange={(e) => form.setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-time" className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      Time
                    </Label>
                    <Input
                      id="scheduled-time"
                      type="time"
                      value={form.formData.scheduledTime}
                      onChange={(e) => form.setScheduledTime(e.target.value)}
                      disabled={!form.formData.scheduledDate}
                    />
                  </div>
                </div>
                {form.formData.scheduledDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.setScheduledDate("");
                      form.setScheduledTime("");
                    }}
                    className="text-xs text-muted-foreground"
                  >
                    Clear schedule
                  </Button>
                )}
              </CollapsibleSection>
            </div>

            {/* Preview */}
            {showPreview && form.isFormValid && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  Preview
                </div>
                <div className="rounded-2xl overflow-hidden shadow-lg bg-background/80 backdrop-blur-md border border-white/10">
                  <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={primaryImageUrl}
                      alt={form.formData.title}
                      className="w-full h-full object-cover"
                    />
                    {imageUpload.images.length > 1 && (
                      <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full">
                        +{imageUpload.images.length - 1} more
                      </span>
                    )}
                    {form.formData.scheduledDate && (
                      <span className="absolute top-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        Scheduled
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {CategoryIcon && (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${categoryData?.bgColor} ${categoryData?.color}`}
                        >
                          <CategoryIcon className="h-3 w-3" />
                          {categoryData?.label}
                        </span>
                      )}
                      {form.formData.condition && (
                        <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-muted">
                          {conditionOptions.find((c) => c.id === form.formData.condition)?.label}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg line-clamp-1 capitalize">
                      {form.formData.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {form.formData.description}
                    </p>

                    {form.formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {form.formData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs text-primary/80 hover:text-primary cursor-pointer"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {form.formData.dietaryLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {form.formData.dietaryLabels.map((labelId) => {
                          const dietary = dietaryOptions.find((d) => d.id === labelId);
                          if (!dietary) return null;
                          const Icon = dietary.icon;
                          return (
                            <span
                              key={labelId}
                              className={`inline-flex items-center gap-0.5 text-xs ${dietary.color}`}
                            >
                              <Icon className="h-3 w-3" />
                              {dietary.label}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {(form.formData.quantity || form.formData.expirationDate) && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        {form.formData.quantity && (
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {form.formData.quantity}
                          </span>
                        )}
                        {form.formData.expirationDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(form.formData.expirationDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                    {(form.formData.address || form.formData.metroStation) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        {form.formData.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="capitalize">{form.formData.address}</span>
                          </span>
                        )}
                        {form.formData.metroStation && (
                          <span className="flex items-center gap-1">
                            <Train className="h-3 w-3" />
                            {form.formData.metroStation}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t mt-2">
                      <span className="text-xs text-muted-foreground">Contact via:</span>
                      {form.formData.contactPreferences.map((prefId) => {
                        const pref = contactOptions.find((c) => c.id === prefId);
                        if (!pref) return null;
                        const Icon = pref.icon;
                        return <Icon key={prefId} className="h-3.5 w-3.5 text-muted-foreground" />;
                      })}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  This is how your listing will appear
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 flex-col sm:flex-row gap-2 border-t mt-2">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground mr-auto">
            <Terminal className="h-3 w-3" />
            <span>⌘ + Enter</span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onDialogOpenChange(false)}
            className="w-full sm:w-auto"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 min-w-[140px]"
            onClick={publishHandler}
            disabled={isLoading || imageUpload.isCompressing}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : form.formData.scheduledDate ? (
              <>
                <CalendarDays className="h-4 w-4 mr-2" />
                Schedule
              </>
            ) : product ? (
              "Update Listing"
            ) : (
              "Publish Listing"
            )}
          </Button>
        </DialogFooter>

        {lightboxIndex !== null && (
          <ImageLightbox
            images={imageUpload.images}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PublishListingModal;
