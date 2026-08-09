"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Loader2,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  FileText,
  RotateCw,
  Save,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { PublishListingModalType } from "./publish-listing/types";
import { categoryConfig, MAX_DESCRIPTION_LENGTH } from "./publish-listing/constants";
import {
  Confetti,
  ProgressBar,
  QualityScore,
  ImageLightbox,
  TemplatePicker,
  AriaAnnouncer,
  SmartTips,
} from "./publish-listing/components";
import { useImageUpload, useListingForm, useUndoRedo } from "./publish-listing/hooks";
import { BasicDetailsStep } from "./publish-listing/steps/BasicDetailsStep";
import { MediaUploadStep } from "./publish-listing/steps/MediaUploadStep";
import { LocationPickupStep } from "./publish-listing/steps/LocationPickupStep";
import { PublishListingFooter } from "./publish-listing/steps/PublishListingFooter";
import DeleteCardModal from "@/components/modals/DeleteCardModal";
import { useAuth } from "@/hooks/useAuth";
import { createProduct, updateProduct } from "@/app/actions/products";
import { fetchUserAddress } from "@/app/actions/profile";
import { useUIStore } from "@/store/zustand/useUIStore";
import { imageAPI } from "@/api/imageAPI";
import type { InitialProductStateType } from "@/types/product.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { STORAGE_BUCKETS } from "@/constants/storage";
import { Button } from "@/components/ui/button";

/**
 * PublishListingModal Component
 * Modal for creating and editing product listings
 * Refactored into modular step components for high maintainability
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, isLoading: isAuthLoading } = useAuth();
  const id = user?.id;
  const { userLocation } = useUIStore();
  const productId = product?.id || 0;

  const [userSavedAddress, setUserSavedAddress] = useState<string>("");

  const {
    images,
    imageError,
    isCompressing,
    isDragOver,
    draggedImageId,
    removeImage,
    handleChangeFile,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    onFileInputClick,
    handleImageDragStart,
    handleImageDragOver,
    handleImageDragEnd,
    initializeFromProduct,
    clearImages,
  } = useImageUpload({
    onImageAdded: () => form.setTouched((prev) => ({ ...prev, image: true })),
  });

  const form = useListingForm({
    isOpen,
    initialCategory: value || "",
    imageCount: images.length,
    userAddress: userSavedAddress,
  });

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
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    if (isOpen && id && !product) {
      fetchUserAddress().then((result) => {
        if (result.success && result.data?.generated_full_address) {
          setUserSavedAddress(result.data.generated_full_address);
        }
      });
    }
  }, [isOpen, id, product]);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        initializeFromProduct(product.images || []);
        form.initializeFromProduct(product);
      } else {
        clearImages();
        form.resetForm(value || "");
      }
      setTimeout(() => {
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
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product, value]);

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

  const handleVoiceTranscript = (transcript: string) => {
    const currentDesc = form.formData.description;
    const newDesc = currentDesc ? `${currentDesc} ${transcript}` : transcript;
    form.setDescription(newDesc.slice(0, MAX_DESCRIPTION_LENGTH));
  };

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

  const existingImageUrls = images.filter((img) => img.isExisting).map((img) => img.url);

  const productObj: Partial<InitialProductStateType> = (() => {
    const obj: Partial<InitialProductStateType> = {
      images: existingImageUrls,
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

    if (product && images[0]?.isExisting) {
      obj.images = product.images?.length > 0 ? product.images : existingImageUrls;
    }

    return obj;
  })();

  async function publishHandler() {
    form.touchAll();

    if (!form.isFormValid || images.length === 0) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      formRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setError(null);
    setUploadProgress(null);

    if (isAuthLoading) {
      setError("Checking authentication... Please try again in a moment.");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }

    if (!id) {
      setError("Please sign in to publish a listing");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }

    if (!navigator.onLine) {
      setError("No internet connection. Please check your network and try again.");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }

    setIsLoading(true);
    setPublishState("loading");

    try {
      const imagesToUpload = images.filter((image) => image.file && image.filePath);
      const finalImageUrls: string[] = [...existingImageUrls];

      if (imagesToUpload.length > 0) {
        setUploadProgress(`Uploading ${imagesToUpload.length} image(s)...`);

        const filesToUpload = imagesToUpload.map((img) => img.file!);
        const batchResult = await imageAPI.uploadBatch(
          filesToUpload,
          { bucket: STORAGE_BUCKETS.POSTS },
          (completed, total) => {
            setUploadProgress(`Uploading ${completed}/${total} image(s)...`);
          }
        );

        if (batchResult.error) {
          throw batchResult.error;
        }

        const { results, summary } = batchResult.data;

        if (summary.failed > 0 && summary.succeeded === 0) {
          throw new Error("Failed to upload images. Please try again.");
        }
        if (summary.failed > 0) {
          throw new Error(`Failed to upload ${summary.failed} image(s). Please try again.`);
        }

        for (const result of results) {
          finalImageUrls.push(result.data.url);
        }
      }

      productObj.images = finalImageUrls;
      setUploadProgress("Saving listing...");

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
      if (userLocation?.latitude !== undefined && userLocation?.longitude !== undefined) {
        formData.set("latitude", userLocation.latitude.toString());
        formData.set("longitude", userLocation.longitude.toString());
      }

      let result;
      if (product) {
        formData.set("is_active", "true");
        result = await updateProduct(productId, formData);
      } else {
        result = await createProduct(formData);
        if (result.success) form.clearDraft();
      }

      if (!result.success) {
        throw new Error(result.error?.message || "Failed to save listing");
      }

      setUploadProgress(null);
      router.refresh();
      setPublishState("success");
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onClose();
      setOpenEdit?.(false);
    } catch (err) {
      console.error("[PublishListing] Error:", err);
      const message =
        err instanceof Error
          ? err.message.includes("sign") || err.message.includes("auth")
            ? "Session expired. Please sign in again."
            : err.message
          : "Failed to publish listing";
      setError(message);
      setUploadProgress(null);
      setPublishState("idle");
    } finally {
      setIsLoading(false);
    }
  }

  const onDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (publishState === "loading") {
        if (
          confirm(
            "Publishing involves uploading images. Closing now may result in incomplete data. Are you sure?"
          )
        ) {
          onClose();
          setOpenEdit?.(false);
        }
      } else {
        onClose();
        setOpenEdit?.(false);
      }
    }
  };

  const showImageError = form.touched.image && images.length === 0;
  const selectedCategory = form.formData.category as keyof typeof categoryConfig;
  const categoryData = selectedCategory ? categoryConfig[selectedCategory] : null;

  if (publishState === "success") {
    return (
      <Dialog open={isOpen} onOpenChange={onDialogOpenChange}>
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
    <>
      <Dialog open={isOpen} onOpenChange={onDialogOpenChange}>
        <DialogContent
          variant="glass"
          className="max-w-md md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
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
              <div className="space-y-5">
                <AriaAnnouncer message={undoRedo.ariaMessage} />

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

                {/* Media Upload Step Component */}
                <MediaUploadStep
                  images={images}
                  imageError={imageError}
                  showImageError={showImageError}
                  isCompressing={isCompressing}
                  isDragOver={isDragOver}
                  draggedImageId={draggedImageId}
                  fileInputRef={fileInputRef}
                  removeImage={removeImage}
                  handleChangeFile={handleChangeFile}
                  handleDrop={handleDrop}
                  handleDragOver={handleDragOver}
                  handleDragLeave={handleDragLeave}
                  onFileInputClick={onFileInputClick}
                  handleImageDragStart={handleImageDragStart}
                  handleImageDragOver={handleImageDragOver}
                  handleImageDragEnd={handleImageDragEnd}
                  onOpenLightbox={(idx) => setLightboxIndex(idx)}
                />

                {/* Basic Details Step Component */}
                <BasicDetailsStep
                  category={form.formData.category}
                  onCategoryChange={(cat) => {
                    form.setCategory(cat);
                    setShowTips(true);
                  }}
                  title={form.formData.title}
                  onTitleChange={form.setTitle}
                  description={form.formData.description}
                  onDescriptionChange={form.setDescription}
                  condition={form.formData.condition}
                  onConditionChange={form.setCondition}
                  showCategoryError={form.showCategoryError}
                  showTitleError={form.showTitleError}
                  onVoiceTranscript={handleVoiceTranscript}
                  onTitleSuggestionSelect={(sug) => form.setTitle(sug)}
                />

                {/* Location & Pickup Step Component */}
                <LocationPickupStep
                  address={form.formData.address}
                  onAddressChange={form.setAddress}
                  time={form.formData.time}
                  onTimeChange={form.setTime}
                  metroStation={form.formData.metroStation}
                  onMetroStationChange={form.setMetroStation}
                  tags={form.formData.tags}
                  onTagsChange={form.setTags}
                  dietary={form.formData.dietaryLabels}
                  onDietaryToggle={form.toggleDietaryLabel}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Component */}
          <PublishListingFooter
            isEditing={!!product}
            isLoading={isLoading}
            isFormValid={form.isFormValid}
            imageCount={images.length}
            scheduledDate={form.formData.scheduledDate}
            onPublish={publishHandler}
            onClose={() => {
              onClose();
              setOpenEdit?.(false);
            }}
            onOpenDeleteModal={() => setIsDeleteOpen(true)}
          />
        </DialogContent>
      </Dialog>

      {/* Lightbox Preview */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {product && (
        <DeleteCardModal
          product={product}
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
}

export default PublishListingModal;
