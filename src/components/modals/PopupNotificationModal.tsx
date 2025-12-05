'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import stars from '@/assets/starsForPopup.webp';
import calendar from '@/assets/image 22.png';
import likeUp from '@/assets/likeUp.svg';
import strawberry from '@/assets/clubnika-min.webp';

import { StarIcon } from '@/utils/icons';
import { useAuth } from '@/hooks/useAuth';
import { useWriteReview } from '@/hooks/queries/useChatQueries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// ============================================================================
// Types & Constants
// ============================================================================

type ModalStep = 'first' | 'second' | 'third' | 'fourth';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FeedbackData {
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
const STAR_COLORS = {
  active: '#319795',
  inactive: '#D1D5DB',
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
    <div className="flex justify-center" role="group" aria-label={t('rate_your_experience')}>
      {Array.from({ length: STAR_COUNT }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={t('rate_count_of_total_stars', { count: i + 1, total: STAR_COUNT })}
          aria-pressed={i < value}
          onClick={() => onChange(i + 1)}
          className="p-1 focus:outline-none focus:ring-2 focus:ring-primary rounded"
        >
          <StarIcon
            size={STAR_SIZE}
            color={i < value ? STAR_COLORS.active : STAR_COLORS.inactive}
            cursor="pointer"
          />
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PopupNotificationModal Component
 * Modal for leaving feedback after a successful exchange
 * Uses React Query for review submission
 */
const PopupNotificationModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const t = useTranslations();
  const searchParams = useSearchParams();

  const { user } = useAuth();
  const userID = user?.id;
  const writeReview = useWriteReview();

  const sharerId = searchParams?.get('s') as string;
  const postId = searchParams?.get('p') as string;
  const requesterId = searchParams?.get('r') as string;

  const [step, setStep] = useState<ModalStep>('second');
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  const handleSubmit = async () => {
    if (step === 'second') {
      setStep('third');
      return;
    }

    if (step === 'third') {
      const feedback: FeedbackData = {
        reviewed_rating: rating,
        profile_id: sharerId === userID ? requesterId : sharerId,
        post_id: Number(postId),
        feedback: feedbackText,
      };

      try {
        await writeReview.mutateAsync(feedback);
        setStep('fourth');
      } catch {
        // Error is handled by React Query - toast notification shown
      }
    }
  };

  const handleClose = () => {
    onClose();
    setStep('second');
    setRating(0);
    setFeedbackText('');
  };

  const getTitle = (): string | null => {
    switch (step) {
      case 'first':
        return t('say_a_day_time');
      case 'second':
        return t('congratulations_you_guys_made_it');
      case 'fourth':
        return t('thank_you_for_your_feedback_its_very_important_for_us');
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
      <DialogContent variant="glass">
        <DialogHeader>
          {title && (
            <DialogTitle className="pt-4 text-base text-center">
              {title}
            </DialogTitle>
          )}
        </DialogHeader>

        <div className="pb-6 pt-0">
          {/* Step 1: Calendar prompt */}
          {step === 'first' && (
            <>
              <Image
                src={calendar}
                alt=""
                width={200}
                height={200}
                className="m-auto"
              />
              <div className="mt-4 space-y-4">
                <div className="flex">
                  <Image
                    src={likeUp}
                    alt=""
                    width={16}
                    height={16}
                    className="pt-2 self-start mr-2"
                  />
                  <p>{t('pickup_time_tip')}</p>
                </div>
                <div className="flex">
                  <Image
                    src={likeUp}
                    alt=""
                    width={16}
                    height={16}
                    className="pb-2 mr-2 rotate-180"
                  />
                  <p>{t('no_delivery_allowed')}</p>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Congratulations */}
          {step === 'second' && (
            <>
              <Image
                src={stars}
                alt=""
                width={250}
                height={80}
                className="object-cover m-auto mb-2.5"
              />
              <p className="font-medium text-center">{t('would_you_like_to_leave_feedback')}</p>
            </>
          )}

          {/* Step 3: Rating form */}
          {step === 'third' && (
            <>
              <StarRating value={rating} onChange={setRating} />
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="mt-5"
                placeholder={t('please_write_your_feedback')}
                aria-label={t('feedback_text')}
              />
            </>
          )}

          {/* Step 4: Thank you */}
          {step === 'fourth' && (
            <Image
              src={strawberry}
              alt=""
              width={200}
              height={200}
              className="m-auto"
            />
          )}

          {/* Action button for steps 2 & 3 */}
          {(step === 'second' || step === 'third') && (
            <Button
              variant="glass"
              className={`block mx-auto mt-5 uppercase glass-accent-orange ${
                step === 'second' ? 'h-[55px] rounded-full' : 'h-10 rounded-lg'
              }`}
              onClick={handleSubmit}
              disabled={writeReview.isPending}
            >
              {writeReview.isPending
                ? t('sending')
                : step === 'second'
                  ? t('yes')
                  : t('send')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PopupNotificationModal;
