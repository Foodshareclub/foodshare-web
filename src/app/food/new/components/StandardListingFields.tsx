"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LISTING } from "@/constants/validation";
import { ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { MAX_IMAGES, type NewListingFormData } from "./types";

interface StandardListingFieldsProps {
  formData: NewListingFormData;
  selectedImagesCount: number;
  imagePreviews: string[];
  isDrafting: boolean;
  isSubmitting: boolean;
  onInputChange: (field: keyof NewListingFormData, value: string) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onAIDraft: () => void;
  onCancel: () => void;
}

const STANDARD_COPY = {
  coverBadge: "Cover photo",
  removePhotoAria: "Remove photo",
  analyzingImages: "Analyzing images...",
  draftWithAi: "Draft with AI",
  draftHint: "AI will suggest a title and description based on your photos",
  titlePlaceholder: "e.g., Fresh Homemade Pasta",
  descriptionPlaceholder: "Describe your item in detail...",
  hoursPlaceholder: "e.g., Weekdays 6-8 PM",
  addressPlaceholder: "Enter your address",
  pickupOnly: "Pickup Only",
  canDeliver: "Can Deliver",
  bothTransport: "Both Pickup & Delivery",
  charactersSuffix: "characters",
} as const;

export function StandardListingFields({
  formData,
  selectedImagesCount,
  imagePreviews,
  isDrafting,
  isSubmitting,
  onInputChange,
  onImageSelect,
  onRemoveImage,
  onAIDraft,
  onCancel,
}: StandardListingFieldsProps) {
  const t = useTranslations();

  return (
    <>
      {/* Photos */}
      <div className="mb-6">
        <Label className="text-base font-semibold mb-2 block text-foreground">
          {t("photos")} <span className="text-destructive">{"*"}</span>
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
                  <img src={preview} alt={`Preview ${index + 1}`} className="w-full aspect-square object-cover" />
                  {index === 0 && (
                    <span className="absolute bottom-2 start-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-black/75 text-white backdrop-blur-xs shadow-xs">
                      {STANDARD_COPY.coverBadge}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index)}
                    aria-label={`${STANDARD_COPY.removePhotoAria} ${index + 1}`}
                    className="absolute top-2 end-2 size-7 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-xs"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {selectedImagesCount < MAX_IMAGES && (
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onImageSelect}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-full p-8 sm:p-10 border-2 border-dashed border-border/80 hover:border-foreground/40 rounded-2xl cursor-pointer hover:bg-muted/30 transition-all text-center"
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-foreground mb-3 shadow-inner">
                  <ImagePlus className="size-7" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {t("click_to_add_photos", {
                    current: selectedImagesCount,
                    max: MAX_IMAGES,
                  })}
                </p>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* AI Draft Button */}
      {selectedImagesCount > 0 && (
        <div className="mb-6">
          <button
            type="button"
            onClick={onAIDraft}
            disabled={isDrafting}
            className="h-10 px-4 rounded-full border border-border/80 bg-background/80 hover:bg-muted/60 hover:border-foreground/30 text-foreground text-xs font-semibold shadow-2xs hover:shadow-xs active:scale-95 transition-all inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDrafting ? (
              <>
                <Loader2 className="size-4 animate-spin text-brand" aria-hidden="true" />
                <span>{STANDARD_COPY.analyzingImages}</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>{STANDARD_COPY.draftWithAi}</span>
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground mt-1.5">{STANDARD_COPY.draftHint}</p>
        </div>
      )}

      {/* Title */}
      <div className="mb-6">
        <Label htmlFor="post_name" className="text-base font-semibold mb-2 block text-foreground">
          {t("title")} <span className="text-destructive">{"*"}</span>
        </Label>
        <Input
          id="post_name"
          type="text"
          value={formData.post_name}
          onChange={(e) => onInputChange("post_name", e.target.value)}
          placeholder={STANDARD_COPY.titlePlaceholder}
          className="w-full h-12 rounded-xl border-border/80 bg-background/60 hover:border-foreground/30 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm"
          maxLength={LISTING.title.maxLength}
        />
        <p className="text-sm text-muted-foreground mt-1">
          {`${formData.post_name.length}/${LISTING.title.maxLength} ${STANDARD_COPY.charactersSuffix}`}
        </p>
      </div>

      {/* Description */}
      <div className="mb-6">
        <Label htmlFor="post_description" className="text-base font-semibold mb-2 block text-foreground">
          {t("description")} <span className="text-destructive">{"*"}</span>
        </Label>
        <Textarea
          id="post_description"
          value={formData.post_description}
          onChange={(e) => onInputChange("post_description", e.target.value)}
          placeholder={STANDARD_COPY.descriptionPlaceholder}
          className="w-full min-h-[120px] rounded-xl border-border/80 bg-background/60 hover:border-foreground/30 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm p-3.5"
          maxLength={LISTING.description.maxLength}
        />
        <p className="text-sm text-muted-foreground mt-1">
          {`${formData.post_description.length}/${LISTING.description.maxLength} ${STANDARD_COPY.charactersSuffix}`}
        </p>
      </div>

      {/* Available Hours */}
      <div className="mb-6">
        <Label htmlFor="available_hours" className="text-base font-semibold mb-2 block text-foreground">
          {t("available_hours")} <span className="text-destructive">{"*"}</span>
        </Label>
        <Input
          id="available_hours"
          type="text"
          value={formData.available_hours}
          onChange={(e) => onInputChange("available_hours", e.target.value)}
          placeholder={STANDARD_COPY.hoursPlaceholder}
          className="w-full h-12 rounded-xl border-border/80 bg-background/60 hover:border-foreground/30 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm"
        />
      </div>

      {/* Transportation */}
      <div className="mb-6">
        <Label htmlFor="transportation" className="text-base font-semibold mb-2 block text-foreground">
          {t("transportation")}
        </Label>
        <Select value={formData.transportation} onValueChange={(value) => onInputChange("transportation", value)}>
          <SelectTrigger
            id="transportation"
            className="w-full h-12 rounded-xl border-border/80 bg-background/60 hover:border-foreground/30 focus:ring-2 focus:ring-primary/20 text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pickup">{STANDARD_COPY.pickupOnly}</SelectItem>
            <SelectItem value="delivery">{STANDARD_COPY.canDeliver}</SelectItem>
            <SelectItem value="both">{STANDARD_COPY.bothTransport}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Address */}
      <div className="mb-6">
        <Label htmlFor="post_address" className="text-base font-semibold mb-2 block text-foreground">
          {t("address")} <span className="text-destructive">{"*"}</span>
        </Label>
        <Input
          id="post_address"
          type="text"
          value={formData.post_address}
          onChange={(e) => onInputChange("post_address", e.target.value)}
          placeholder={STANDARD_COPY.addressPlaceholder}
          className="w-full h-12 rounded-xl border-border/80 bg-background/60 hover:border-foreground/30 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm"
        />
        <p className="text-sm text-muted-foreground mt-1">{t("your_exact_address_wont_be_shared_publicly")}</p>
      </div>

      {/* Submit */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-border/40">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 h-12 rounded-xl border-border/80 bg-background/80 hover:bg-muted/60 hover:border-foreground/30 text-foreground font-semibold text-sm active:scale-95 transition-all"
        >
          {t("cancel")}
        </Button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-12 rounded-xl font-semibold text-sm bg-brand hover:bg-brand-hover active:scale-95 text-white shadow-xs hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t("creating")}
            </span>
          ) : (
            t("create_listing")
          )}
        </button>
      </div>
    </>
  );
}
