"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Target,
  Users,
  Zap,
  Award,
  Clock,
  CheckCircle,
  Share2,
  Heart,
  Star,
  TrendingUp,
  Gift,
  Shield,
  Flag,
  Flame,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";
import { acceptChallenge } from "@/app/actions/challenges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Challenge } from "@/lib/data/challenges";
import type { AuthUser } from "@/app/actions/auth";

interface ChallengeDetailClientProps {
  challenge: Challenge;
  user: AuthUser | null;
  isAccepted: boolean;
}

const DIFFICULTY_CONFIG = {
  Easy: {
    color: "bg-green-500",
    gradient: "from-green-500 to-emerald-600",
    text: "text-green-500",
    icon: Star,
    xp: 10,
    badge: "🌱",
  },
  Medium: {
    color: "bg-yellow-500",
    gradient: "from-yellow-500 to-orange-500",
    text: "text-yellow-500",
    icon: Flame,
    xp: 25,
    badge: "🔥",
  },
  Hard: {
    color: "bg-red-500",
    gradient: "from-red-500 to-pink-600",
    text: "text-red-500",
    icon: Zap,
    xp: 50,
    badge: "⚡",
  },
} as const;

const REWARDS = [
  { icon: "🏆", name: "Challenge Champion", description: "Complete this challenge" },
  { icon: "🌟", name: "Community Hero", description: "Join 100+ participants" },
  { icon: "💚", name: "Eco Warrior", description: "Make a positive impact" },
];

export function ChallengeDetailClient({
  challenge,
  user,
  isAccepted: initialIsAccepted,
}: ChallengeDetailClientProps) {
  const router = useRouter();
  const [isAccepted, setIsAccepted] = useState(initialIsAccepted);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const difficulty = (challenge.challenge_difficulty as keyof typeof DIFFICULTY_CONFIG) || "Easy";
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Easy;
  const DifficultyIcon = config.icon;

  const handleAccept = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setIsAccepting(true);
    const result = await acceptChallenge(challenge.id);
    setIsAccepting(false);

    if (result.success) {
      setIsAccepted(true);

      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FF2D55", "#00A699", "#FFD700"],
      });
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: challenge.challenge_title,
      text: `Join me in the "${challenge.challenge_title}" challenge on FoodShare! 🌍`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch (error) {
      // User cancelled share dialog - this is expected, not an error
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      // Fallback to clipboard for other errors
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  const progressPercent = Math.min((Number(challenge.challenged_people) / 100) * 100, 100);

  return (
    <div className="bg-gradient-to-b from-background to-background/95">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-10 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      {/* Hero Section */}
      <div className="relative">
        {/* Image */}
        <div className="relative h-80 sm:h-[28rem] overflow-hidden">
          <Image
            src={challenge.challenge_image}
            alt={challenge.challenge_title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

          {/* Floating particles effect */}
          <div className="absolute inset-0">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/30 rounded-full"
                style={{ left: `${15 + i * 15}%`, top: "60%" }}
                animate={{ y: [-20, -60, -20], opacity: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
              />
            ))}
          </div>
        </div>

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <Link href="/challenge">
            <Button
              variant="ghost"
              size="sm"
              className="bg-black/30 backdrop-blur-md text-white hover:bg-black/50 border border-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Challenges
            </Button>
          </Link>
        </div>

        {/* XP Badge - Animated */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
          className="absolute top-4 right-4"
        >
          <div
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-2xl text-white shadow-2xl",
              `bg-gradient-to-r ${config.gradient}`
            )}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <Zap className="w-6 h-6" />
            </motion.div>
            <div>
              <div className="text-2xl font-black">{config.xp}</div>
              <div className="text-xs opacity-80">XP REWARD</div>
            </div>
          </div>
        </motion.div>

        {/* Title Card - Overlapping */}
        <div className="relative -mt-32 mx-4 sm:mx-auto max-w-4xl z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-border/50"
          >
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge className={cn("text-white text-sm px-3 py-1", config.color)}>
                <DifficultyIcon className="w-4 h-4 mr-1" />
                {difficulty}
              </Badge>
              <Badge variant="outline" className="text-sm px-3 py-1">
                <Flag className="w-3 h-3 mr-1" />
                {challenge.challenge_action}
              </Badge>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                <span className="mr-1">{config.badge}</span>
                {config.xp} XP
              </Badge>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground mb-4 leading-tight">
              {challenge.challenge_title}
            </h1>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">{challenge.challenged_people}</span>
                <span>joined</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                <span className="font-semibold text-foreground">
                  {challenge.challenge_likes_counter}
                </span>
                <span>likes</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="font-semibold text-foreground">{challenge.challenge_views}</span>
                <span>views</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Accept Challenge CTA - Prominent */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {isAccepted ? (
              <motion.div
                key="accepted"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-white text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="mb-4"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Challenge Accepted! 🎉</h2>
                <p className="text-white/80">
                  You&apos;re now part of the movement. Let&apos;s make a difference!
                </p>

                {/* Sparkles */}
                <Sparkles className="absolute top-4 left-4 w-6 h-6 text-white/40" />
                <Sparkles className="absolute bottom-4 right-4 w-8 h-8 text-white/40" />
              </motion.div>
            ) : (
              <motion.div
                key="not-accepted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "relative overflow-hidden rounded-3xl p-8 text-white",
                  `bg-gradient-to-r ${config.gradient}`
                )}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Ready to make an impact?</h2>
                    <p className="text-white/80">
                      Join {challenge.challenged_people} others and earn {config.xp} XP!
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="bg-white text-foreground hover:bg-white/90 font-bold px-8 py-6 text-lg shadow-xl disabled:opacity-70"
                  >
                    <Target className="w-5 h-5 mr-2" />
                    {isAccepting ? "Accepting..." : user ? "Accept Challenge" : "Login to Accept"}
                  </Button>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Progress Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-3xl p-6 border border-border shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Community Progress
            </h3>
            <span className="text-2xl font-black text-primary">{progressPercent.toFixed(0)}%</span>
          </div>

          <div className="relative h-4 bg-muted rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              className={cn("h-full rounded-full relative", `bg-gradient-to-r ${config.gradient}`)}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
            </motion.div>
          </div>

          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{challenge.challenged_people} participants</span>
            <span>Goal: 100 participants</span>
          </div>
        </motion.div>

        {/* About Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-3xl p-6 border border-border shadow-lg"
        >
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            About This Challenge
          </h3>
          <p className="text-muted-foreground leading-relaxed text-lg">
            {challenge.challenge_description}
          </p>
        </motion.div>

        {/* Rewards Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-3xl p-6 border border-border shadow-lg"
        >
          <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Rewards & Achievements
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {REWARDS.map((reward, index) => (
              <motion.div
                key={reward.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -4 }}
                className="relative p-4 rounded-2xl bg-gradient-to-br from-muted/50 to-muted text-center border border-border/50 cursor-pointer"
              >
                <div className="text-4xl mb-2">{reward.icon}</div>
                <h4 className="font-semibold text-foreground text-sm">{reward.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{reward.description}</p>

                {/* Lock overlay for non-accepted */}
                {!isAccepted && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center">
                    <span className="text-2xl">🔒</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap gap-4"
        >
          <Button
            size="lg"
            variant="outline"
            className="gap-2 flex-1 sm:flex-none"
            onClick={() => setIsLiked(!isLiked)}
          >
            <motion.div
              animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Heart className={cn("w-5 h-5", isLiked && "fill-red-500 text-red-500")} />
            </motion.div>
            {isLiked ? "Liked!" : "Like"}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="gap-2 flex-1 sm:flex-none"
            onClick={handleShare}
          >
            <Share2 className="w-5 h-5" />
            Share Challenge
          </Button>
        </motion.div>

        {/* Metadata Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center justify-between pt-6 border-t border-border text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Created {new Date(challenge.challenge_created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            <span>{challenge.challenge_score} points available</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default ChallengeDetailClient;
