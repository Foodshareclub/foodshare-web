"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type React from "react";
import { useState, useTransition } from "react";

import strawberry from "@/assets/clubnika-min.webp";
import calendar from "@/assets/image 22.png";
import likeUp from "@/assets/likeUp.svg";
import stars from "@/assets/starsForPopup.webp";

import { writeReview } from "@/app/actions/chat";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

// ============================================================================
// Types & Constants
// ============================================================================

type ModalStep = "first" | "second" | "third" | "fourth";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface _FeedbackData {
  id?: number;
  reviewed_rating: number;
  profile_id: string;
  post_id: number;
  forum_id?: number;
  challenge_id?: number;
  feedback: string;
}

const STAR_COUNT = 5;
const STAR_SIZE = 40;
const STAR_BUTTON_KEYS = Array.from({ length: STAR_COUNT }, (_, i) => `star-button-${i}`);
const STAR_COLORS = {
  active: "#319795",
  inactive: "#D1D5DB",
} as const;

// ============================================================================
// Sub-components
// ============================================================================

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
}

function StarRating({ value, onChange }: StarRatingProps) {
  const t = useTranslations();

  return (
    <fieldset className="flex justify-center gap-1.5 py-2" aria-label={t("rate_your_experience")}>
      {Array.from({ length: STAR_COUNT }, (_, i) => (
        <button
          key={STAR_BUTTON_KEYS[i]}
          type="button"
          aria-label={t("rate_count_of_total_stars", { count: i + 1, total: STAR_COUNT })}
          aria-pressed={i < value}
          onClick={() => onChange(i + 1)}
          className="p-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30 rounded-full transition-transform hover:scale-125 duration-200"
        >
          <Star
            className={cn(
              "size-8 cursor-pointer transition-colors",
              i < value ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30 hover:text-amber-300",
            )}
            aria-hidden="true"
          />
        </button>
      ))}
    </fieldset>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PopupNotificationModal Component
 * Modal for leaving feedback after a successful exchange
 * Uses Server Actions for review submission
 */
const PopupNotificationModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const t = useTranslations();
  const searchParams = useSearchParams();

  const { user } = useAuth();
  const userID = user?.id;

  const sharerId = searchParams?.get("s") as string;
  const postId = searchParams?.get("p") as string;
  const requesterId = searchParams?.get("r") as string;

  const [step, setStep] = useState<ModalStep>("second");
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (step === "second") {
      setStep("third");
      return;
    }

    if (step === "third") {
      startTransition(async () => {
        try {
          const formData = new FormData();
          formData.set("reviewed_rating", String(rating));
          formData.set("profile_id", sharerId === userID ? requesterId : sharerId);
          formData.set("post_id", postId);
          formData.set("feedback", feedbackText);

          const result = await writeReview(formData);
          if (!result.success) {
            throw new Error(result.error?.message || "Failed to submit review");
          }
          setStep("fourth");
        } catch {
          // Error handling - could add toast notification here
        }
      });
    }
  };

  const handleClose = () => {
    onClose();
    setStep("second");
    setRating(0);
    setFeedbackText("");
  };

  const getTitle = (): string | null => {
    switch (step) {
      case "first":
        return t("say_a_day_time");
      case "second":
        return t("congratulations_you_guys_made_it");
      case "fourth":
        return t("thank_you_for_your_feedback_its_very_important_for_us");
      default:
        return null;
    }
  };

  const title = getTitle();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent
        variant="glass"
        className="rounded-3xl border border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-8"
      >
        <DialogHeader>
          {title && (
            <DialogTitle className="pt-2 text-lg sm:text-xl font-bold tracking-tight text-center text-foreground">
              {title}
            </DialogTitle>
          )}
        </DialogHeader>

        <div className="pb-4 pt-2">
          {/* Step 1: Calendar prompt */}
          {step === "first" && (
            <>
              <Image src={calendar} alt="" width={200} height={200} className="m-auto" />
              <div className="mt-4 space-y-4">
                <div className="flex">
                  <Image src={likeUp} alt="" width={16} height={16} className="pt-2 self-start me-2" />
                  <p>{t("pickup_time_tip")}</p>
                </div>
                <div className="flex">
                  <Image src={likeUp} alt="" width={16} height={16} className="pb-2 me-2 rotate-180" />
                  <p>{t("no_delivery_allowed")}</p>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Congratulations */}
          {step === "second" && (
            <>
              <Image src={stars} alt="" width={250} height={80} className="object-cover m-auto mb-2.5" />
              <p className="font-medium text-center text-foreground">{t("would_you_like_to_leave_feedback")}</p>
            </>
          )}

          {/* Step 3: Rating form */}
          {step === "third" && (
            <>
              <StarRating value={rating} onChange={setRating} />
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="mt-5 rounded-xl border border-border/80 bg-background/80 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm p-3.5 transition-all"
                placeholder={t("please_write_your_feedback")}
                aria-label={t("feedback_text")}
              />
            </>
          )}

          {/* Step 4: Thank you */}
          {step === "fourth" && <Image src={strawberry} alt="" width={200} height={200} className="m-auto" />}

          {/* Action button for steps 2 & 3 */}
          {(step === "second" || step === "third") && (
            <Button
              className="w-full sm:w-auto min-w-[160px] h-12 px-7 rounded-xl bg-brand hover:bg-brand-hover active:scale-95 text-white font-semibold text-sm shadow-xs hover:shadow-sm transition-all block mx-auto mt-6"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? t("sending") : step === "second" ? t("yes") : t("send")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PopupNotificationModal;
