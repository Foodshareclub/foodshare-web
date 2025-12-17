"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Target, Users, TrendingUp, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChallengeRevealModal } from "@/components/modals/challenge-reveal";
import { ChallengeDeck } from "@/components/challenges/ChallengeDeck";
import type { InitialProductStateType } from "@/types/product.types";
import type { AuthUser } from "@/app/actions/auth";

interface ChallengesClientProps {
  challenges: InitialProductStateType[];
  user: AuthUser | null;
  stats: { totalChallenges: number; totalParticipants: number };
}

export function ChallengesClient({ challenges, user, stats }: ChallengesClientProps) {
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const isAuth = !!user;

  return (
    <>
      {/* Full-screen Hero with Deck as Centerpiece */}
      <HeroSection
        stats={stats}
        isAuth={isAuth}
        challenges={challenges}
        onDiscoverClick={() => setRevealModalOpen(true)}
      />

      {/* Challenge Reveal Modal */}
      <ChallengeRevealModal
        open={revealModalOpen}
        onOpenChange={setRevealModalOpen}
        challenges={challenges}
      />
    </>
  );
}

// ============================================================================
// Hero Section - Immersive Full-Screen Experience
// ============================================================================

function HeroSection({
  stats,
  isAuth,
  challenges,
  onDiscoverClick,
}: {
  stats: { totalChallenges: number; totalParticipants: number };
  isAuth: boolean;
  challenges: InitialProductStateType[];
  onDiscoverClick: () => void;
}) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-background via-primary/5 to-teal-500/5">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large primary orb */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Teal orb */}
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/20 rounded-full blur-[80px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.2, 0.4],
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        {/* Orange accent orb */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/30 rounded-full"
            style={{
              left: `${20 + i * 12}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-12">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 text-primary">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Discover Your Next Challenge</span>
          </div>
        </motion.div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground mb-4">
            Make the World{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-pink-500 to-teal-500 animate-pulse">
              Better
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Shuffle through challenges, accept your mission, and earn XP while making a positive
            impact.
          </p>
        </motion.div>

        {/* The Star: Challenge Deck */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 20 }}
          className="relative mb-12"
        >
          {/* Glow ring behind deck */}
          <div className="absolute -inset-8 bg-gradient-to-r from-primary/20 via-teal-500/20 to-orange-500/20 rounded-[3rem] blur-2xl opacity-60" />

          <ChallengeDeck
            challenges={challenges}
            onCardClick={onDiscoverClick}
            autoShuffle
            className="relative z-10"
          />
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-wrap justify-center gap-4 mb-8"
        >
          <StatCard icon={Target} value={stats.totalChallenges} label="Challenges" />
          <StatCard icon={Users} value={stats.totalParticipants} label="Participants" />
          <StatCard icon={TrendingUp} value="2.5K" label="XP Earned" />
        </motion.div>

        {/* CTA for non-auth users */}
        {!isAuth && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
            <Link href="/auth/login">
              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-primary to-teal-500 hover:from-primary/90 hover:to-teal-500/90 shadow-lg shadow-primary/25"
              >
                Join the Movement
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: number | string;
  label: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
    >
      <div className="p-1.5 rounded-lg bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="text-left">
        <div className="text-lg font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </motion.div>
  );
}

export default ChallengesClient;
