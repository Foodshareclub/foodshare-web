'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  FiTarget,
  FiUsers,
  FiTrendingUp,
  FiZap,
  FiAward,
  FiChevronRight,
  FiStar,
} from 'react-icons/fi';
import { HiOutlineFire } from 'react-icons/hi';
import Navbar from '@/components/header/navbar/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { InitialProductStateType } from '@/types/product.types';
import type { Challenge } from '@/lib/data/challenges';
import type { AuthUser } from '@/app/actions/auth';

interface ChallengesClientProps {
  challenges: InitialProductStateType[];
  popularChallenges: Challenge[];
  user: AuthUser | null;
  stats: { totalChallenges: number; totalParticipants: number };
}

type Difficulty = 'all' | 'Easy' | 'Medium' | 'Hard';

const DIFFICULTY_CONFIG = {
  Easy: { color: 'bg-green-500', text: 'text-green-500', icon: FiStar, xp: 10 },
  Medium: { color: 'bg-yellow-500', text: 'text-yellow-500', icon: HiOutlineFire, xp: 25 },
  Hard: { color: 'bg-red-500', text: 'text-red-500', icon: FiZap, xp: 50 },
} as const;

export function ChallengesClient({
  challenges,
  popularChallenges,
  user,
  stats,
}: ChallengesClientProps) {
  const router = useRouter();
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('all');
  const [productType, setProductType] = useState('challenge');
  const t = useTranslations('Common');

  const filteredChallenges =
    selectedDifficulty === 'all'
      ? challenges
      : challenges.filter((c) => c.condition === selectedDifficulty);

  const isAuth = !!user;
  const userId = user?.id || '';
  const profile = user?.profile;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  const handleRouteChange = (route: string) => {
    router.push(`/${route}`);
  };

  const handleProductTypeChange = (type: string) => {
    setProductType(type);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        userId={userId}
        isAuth={isAuth}
        isAdmin={isAdmin}
        productType={productType}
        onRouteChange={handleRouteChange}
        onProductTypeChange={handleProductTypeChange}
        imgUrl={profile?.avatar_url || ''}
        firstName={profile?.first_name || ''}
        secondName={profile?.second_name || ''}
        email={profile?.email || ''}
        signalOfNewMessage={[]}
      />

      {/* Hero Section */}
      <HeroSection stats={stats} isAuth={isAuth} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Challenges */}
        {popularChallenges.length > 0 && (
          <FeaturedSection challenges={popularChallenges} />
        )}

        {/* Filter Bar */}
        <FilterBar
          selected={selectedDifficulty}
          onSelect={setSelectedDifficulty}
          counts={{
            all: challenges.length,
            Easy: challenges.filter((c) => c.condition === 'Easy').length,
            Medium: challenges.filter((c) => c.condition === 'Medium').length,
            Hard: challenges.filter((c) => c.condition === 'Hard').length,
          }}
        />

        {/* Challenge Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8"
        >
          <AnimatePresence mode="popLayout">
            {filteredChallenges.map((challenge, index) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                index={index}
                isAuth={!!user}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredChallenges.length === 0 && (
          <EmptyState difficulty={selectedDifficulty} />
        )}
      </div>
    </div>
  );
}


// ============================================================================
// Hero Section
// ============================================================================

function HeroSection({
  stats,
  isAuth,
}: {
  stats: { totalChallenges: number; totalParticipants: number };
  isAuth: boolean;
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-teal-500/10 to-orange-500/10">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <FiTarget className="w-4 h-4" />
            <span className="text-sm font-medium">Community Challenges</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            Make the World{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-500">
              Better
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Join challenges, earn XP, compete with the community, and create positive impact.
            Every action counts!
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <StatCard
              icon={FiTarget}
              value={stats.totalChallenges}
              label="Active Challenges"
            />
            <StatCard
              icon={FiUsers}
              value={stats.totalParticipants}
              label="Participants"
            />
            <StatCard icon={FiTrendingUp} value="2.5K" label="XP Earned" />
          </div>

          {!isAuth && (
            <Link href="/auth/login">
              <Button size="lg" className="gap-2">
                Join the Movement
                <FiChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </motion.div>
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


// ============================================================================
// Featured Section
// ============================================================================

function FeaturedSection({ challenges }: { challenges: Challenge[] }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <HiOutlineFire className="w-5 h-5 text-orange-500" />
        <h2 className="text-xl font-semibold text-foreground">Trending Now</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {challenges.map((challenge, index) => (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={`/challenge/${challenge.id}`}>
              <div className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer">
                <Image
                  src={challenge.challenge_image}
                  alt={challenge.challenge_title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Rank badge */}
                <div className="absolute top-3 left-3">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500 text-white text-xs font-bold">
                    <FiTrendingUp className="w-3 h-3" />#{index + 1}
                  </div>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold mb-1 line-clamp-1">
                    {challenge.challenge_title}
                  </h3>
                  <div className="flex items-center gap-3 text-white/80 text-sm">
                    <span className="flex items-center gap-1">
                      <FiUsers className="w-3 h-3" />
                      {challenge.challenged_people}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiZap className="w-3 h-3" />
                      {challenge.challenge_score} XP
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Filter Bar
// ============================================================================

function FilterBar({
  selected,
  onSelect,
  counts,
}: {
  selected: Difficulty;
  onSelect: (d: Difficulty) => void;
  counts: Record<Difficulty, number>;
}) {
  const filters: { key: Difficulty; label: string }[] = [
    { key: 'all', label: 'All Challenges' },
    { key: 'Easy', label: 'Easy' },
    { key: 'Medium', label: 'Medium' },
    { key: 'Hard', label: 'Hard' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map(({ key, label }) => {
        const isActive = selected === key;
        const config = key !== 'all' ? DIFFICULTY_CONFIG[key] : null;

        return (
          <motion.button
            key={key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
              isActive
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-card hover:bg-accent text-foreground border border-border'
            )}
          >
            {config && <config.icon className="w-4 h-4" />}
            {label}
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs',
                isActive ? 'bg-white/20' : 'bg-muted'
              )}
            >
              {counts[key]}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}


// ============================================================================
// Challenge Card
// ============================================================================

function ChallengeCard({
  challenge,
  index,
  isAuth,
}: {
  challenge: InitialProductStateType;
  index: number;
  isAuth: boolean;
}) {
  const difficulty = (challenge.condition as keyof typeof DIFFICULTY_CONFIG) || 'Easy';
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Easy;
  const DifficultyIcon = config.icon;

  const imageUrl = challenge.images?.[0] || '/placeholder-challenge.webp';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link href={`/challenge/${challenge.id}`}>
        <div className="relative bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300">
          {/* Image */}
          <div className="relative h-48 overflow-hidden">
            <Image
              src={imageUrl}
              alt={challenge.post_name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* XP Badge */}
            <div className="absolute top-3 right-3">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-sm font-bold"
              >
                <FiZap className="w-4 h-4 text-yellow-400" />
                {config.xp} XP
              </motion.div>
            </div>

            {/* Difficulty Badge */}
            <div className="absolute top-3 left-3">
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs font-medium',
                  config.color
                )}
              >
                <DifficultyIcon className="w-3 h-3" />
                {difficulty}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
              {challenge.post_name}
            </h3>

            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {challenge.post_description}
            </p>

            {/* Stats Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FiUsers className="w-4 h-4" />
                  {challenge.post_like_counter || 0}
                </span>
                <span className="flex items-center gap-1">
                  <FiAward className="w-4 h-4" />
                  {challenge.post_views || 0} views
                </span>
              </div>
            </div>

            {/* Progress Bar (visual only for now) */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Community Progress</span>
                <span>{Math.min(((challenge.post_like_counter || 0) / 100) * 100, 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((challenge.post_like_counter || 0) / 100) * 100, 100)}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                  className={cn('h-full rounded-full', config.color)}
                />
              </div>
            </div>

            {/* CTA Button */}
            <Button
              className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground"
              variant="outline"
            >
              <FiTarget className="w-4 h-4" />
              {isAuth ? 'Accept Challenge' : 'View Challenge'}
              <FiChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ difficulty }: { difficulty: Difficulty }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-16"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <FiTarget className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No {difficulty !== 'all' ? difficulty : ''} Challenges Yet
      </h3>
      <p className="text-muted-foreground">
        Check back soon for new challenges to conquer!
      </p>
    </motion.div>
  );
}

export default ChallengesClient;
