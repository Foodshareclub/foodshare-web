"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { LISTING } from "@/constants/validation";
import { Camera, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { AVAILABILITY_OPTIONS, type NewListingFormData, VOLUNTEER_SKILLS } from "./types";

interface VolunteerApplicationFieldsProps {
  formData: NewListingFormData;
  imagePreviews: string[];
  isSubmitting: boolean;
  onInputChange: (field: keyof NewListingFormData, value: string) => void;
  onSkillToggle: (skillId: string) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onCancel: () => void;
}

const VOLUNTEER_COPY = {
  bannerTitle: "Join Our Volunteer Team",
  bannerSubtitle: "Help us reduce food waste and strengthen communities",
  photoLabel: "Your Photo",
  optionalTag: "(Optional)",
  photoHelp: "Add a friendly photo so the community can get to know you",
  uploadCta: "Click to upload your photo",
  photoAlt: "Your profile preview",
  removePhotoAria: "Remove photo",
  nameLabel: "Your Name / Title",
  namePlaceholder: 'e.g., "Sarah M. - Community Food Rescuer"',
  aboutLabel: "Tell us about yourself",
  aboutPlaceholder:
    "Why do you want to volunteer? What skills do you bring? What motivates you to help reduce food waste?",
  skillsLabel: "Your Skills",
  skillsHint: "(select all that apply)",
  availabilityLabel: "When are you available?",
  locationLabel: "Your Location",
  locationPlaceholder: "e.g., Sacramento, CA",
  locationHint: "Your exact address won't be shared - only your general area",
  submitting: "Submitting...",
  submitCta: "Submit My Volunteer Application",
  reviewNote: "Your application will be reviewed by our team. We'll notify you once approved!",
  charactersSuffix: "characters",
} as const;

export function VolunteerApplicationFields({
  formData,
  imagePreviews,
  isSubmitting,
  onInputChange,
  onSkillToggle,
  onImageSelect,
  onRemoveImage,
  onCancel,
}: VolunteerApplicationFieldsProps) {
  const t = useTranslations();

  return (
    <>
      <div className="mb-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-6 text-white text-center">
        <h2 className="text-2xl font-bold mb-2">{VOLUNTEER_COPY.bannerTitle}</h2>
        <p className="opacity-90">{VOLUNTEER_COPY.bannerSubtitle}</p>
      </div>

      {/* Volunteer Photo */}
      <div className="mb-6">
        <Label className="text-base font-semibold mb-2 block">
          {`${VOLUNTEER_COPY.photoLabel} `}
          <span className="text-muted-foreground font-normal">{VOLUNTEER_COPY.optionalTag}</span>
        </Label>
        <p className="text-sm text-muted-foreground mb-3">{VOLUNTEER_COPY.photoHelp}</p>
        <div className="space-y-4">
          {imagePreviews.length > 0 ? (
            <div className="flex justify-center">
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs for local previews */}
                <img
                  src={imagePreviews[0]}
                  alt={formData.post_name || VOLUNTEER_COPY.photoAlt}
                  className="w-32 h-32 object-cover rounded-full border-4 border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(0)}
                  aria-label={VOLUNTEER_COPY.removePhotoAria}
                  className="absolute -top-1 -end-1 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={onImageSelect}
                className="hidden"
                id="volunteer-photo-upload"
              />
              <label
                htmlFor="volunteer-photo-upload"
                className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors bg-emerald-50/50 dark:bg-emerald-950/20"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-3">
                  <Camera className="w-8 h-8 text-emerald-600" aria-hidden="true" />
                </div>
                <p className="text-sm text-muted-foreground">{VOLUNTEER_COPY.uploadCta}</p>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Volunteer Name/Title */}
      <div className="mb-6">
        <Label htmlFor="post_name" className="text-base font-semibold mb-2 block">
          {VOLUNTEER_COPY.nameLabel} <span className="text-red-500">{"*"}</span>
        </Label>
        <Input
          id="post_name"
          type="text"
          value={formData.post_name}
          onChange={(e) => onInputChange("post_name", e.target.value)}
          placeholder={VOLUNTEER_COPY.namePlaceholder}
          className="w-full"
          maxLength={LISTING.title.maxLength}
        />
        <p className="text-sm text-muted-foreground mt-1">
          {`${formData.post_name.length}/${LISTING.title.maxLength} ${VOLUNTEER_COPY.charactersSuffix}`}
        </p>
      </div>

      {/* About Yourself */}
      <div className="mb-6">
        <Label htmlFor="post_description" className="text-base font-semibold mb-2 block">
          {VOLUNTEER_COPY.aboutLabel} <span className="text-red-500">{"*"}</span>
        </Label>
        <Textarea
          id="post_description"
          value={formData.post_description}
          onChange={(e) => onInputChange("post_description", e.target.value)}
          placeholder={VOLUNTEER_COPY.aboutPlaceholder}
          className="w-full min-h-[140px]"
          maxLength={LISTING.description.maxLength}
        />
        <p className="text-sm text-muted-foreground mt-1">
          {`${formData.post_description.length}/${LISTING.description.maxLength} ${VOLUNTEER_COPY.charactersSuffix}`}
        </p>
      </div>

      {/* Skills Multi-Select */}
      <div className="mb-6">
        <Label className="text-base font-semibold mb-2 block">
          {`${VOLUNTEER_COPY.skillsLabel} `}
          <span className="text-muted-foreground font-normal">{VOLUNTEER_COPY.skillsHint}</span>
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
                onCheckedChange={() => onSkillToggle(skill.id)}
                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
              <span className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <skill.Icon className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>{skill.label}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="mb-6">
        <Label className="text-base font-semibold mb-2 block">
          {VOLUNTEER_COPY.availabilityLabel} <span className="text-red-500">{"*"}</span>
        </Label>
        <RadioGroup
          value={formData.available_hours}
          onValueChange={(value) => onInputChange("available_hours", value)}
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
          {VOLUNTEER_COPY.locationLabel} <span className="text-red-500">{"*"}</span>
        </Label>
        <Input
          id="post_address"
          type="text"
          value={formData.post_address}
          onChange={(e) => onInputChange("post_address", e.target.value)}
          placeholder={VOLUNTEER_COPY.locationPlaceholder}
          className="w-full"
        />
        <p className="text-sm text-muted-foreground mt-1">{VOLUNTEER_COPY.locationHint}</p>
      </div>

      {/* Volunteer Submit Section */}
      <div className="pt-4 space-y-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl font-semibold text-sm bg-brand hover:bg-brand-hover active:scale-95 text-white shadow-xs hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {VOLUNTEER_COPY.submitting}
            </span>
          ) : (
            VOLUNTEER_COPY.submitCta
          )}
        </button>
        <p className="text-center text-sm text-muted-foreground">{VOLUNTEER_COPY.reviewNote}</p>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl border-border/80 bg-background/80 hover:bg-muted/60 text-foreground font-semibold text-sm active:scale-95 transition-all"
        >
          {t("cancel")}
        </Button>
      </div>
    </>
  );
}
