import type { Challenge } from "@/lib/data/challenges";
import type { InitialProductStateType } from "@/types/product.types";

export type SwipeDirection = "left" | "right" | null;

export type ChallengeItem = Challenge | InitialProductStateType;

export interface DeckState {
  challenges: ChallengeItem[];
  currentIndex: number;
  isShuffling: boolean;
  isEmpty: boolean;
}

export interface SwipeGestureConfig {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  swipeThreshold?: number;
  velocityThreshold?: number;
}

export interface ChallengeRevealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenges: ChallengeItem[];
  activeChallenge?: ChallengeItem | null;
  onAccept?: (challengeId: number) => void;
}

export interface CardFaceProps {
  challenge: ChallengeItem;
  className?: string;
}

export interface SwipeableCardProps {
  challenge: ChallengeItem;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export interface DeckStackProps {
  challenges: ChallengeItem[];
  isShuffling: boolean;
}

export interface CardDeckProps {
  challenges: ChallengeItem[];
  activeChallenge?: ChallengeItem | null;
  onAccept?: (challengeId: number) => void;
  onComplete?: () => void;
}

export interface SwipeIndicatorsProps {
  leftOpacity: number;
  rightOpacity: number;
}

export interface ActionButtonsProps {
  onSkip: () => void;
  onAccept: () => void;
  disabled?: boolean;
}

// Helper to normalize challenge data from different sources
export function getChallengeData(challenge: ChallengeItem) {
  // Check if it's a Challenge type (from lib/data/challenges)
  if ("challenge_title" in challenge) {
    return {
      id: challenge.id,
      title: challenge.challenge_title,
      description: challenge.challenge_description,
      image: challenge.challenge_image,
      difficulty: challenge.challenge_difficulty as "Easy" | "Medium" | "Hard",
      score: Number(challenge.challenge_score) || 0,
      participants: Number(challenge.challenged_people) || 0,
    };
  }

  // It's InitialProductStateType (from challenges page)
  return {
    id: challenge.id,
    title: challenge.post_name,
    description: challenge.post_description,
    image: challenge.images?.[0] || "/placeholder-challenge.webp",
    difficulty: (challenge.condition as "Easy" | "Medium" | "Hard") || "Easy",
    score: Number(challenge.post_like_counter) || 0,
    participants: Number(challenge.post_views) || 0,
  };
}
