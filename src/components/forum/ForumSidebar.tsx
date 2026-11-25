"use client";

import type { ForumCategory, ForumPost, ForumTag } from "@/api/forumAPI";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Clock,
  Crown,
  Filter,
  Flame,
  Hash,
  Heart,
  HelpCircle,
  Lightbulb,
  Medal,
  Star,
  Trophy,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { LeaderboardUser } from "@/lib/data/forum";

const LEADERBOARD_BADGES = [
  { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { icon: Medal, color: "text-gray-400", bg: "bg-gray-400/10" },
  { icon: Medal, color: "text-amber-600", bg: "bg-amber-600/10" },
] as const;

const SIDEBAR_LABELS = {
  postsSuffix: "posts",
  likesSuffix: "likes",
  pointsLabel: "points",
  postedVerb: "posted",
  someone: "Someone",
  anonymous: "Anonymous",
} as const;

function formatCompactAge(createdAt: string, nowMs: number | null): string {
  if (nowMs === null) return "";
  const diff = Math.max(0, nowMs - new Date(createdAt).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  gradient,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  gradient: string;
}) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br text-white cursor-pointer group",
          "transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]",
          gradient,
        )}
      >
        <div className="absolute top-0 end-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 rtl:-translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
        <Icon className="w-8 h-8 mb-3 relative z-10" aria-hidden="true" />
        <h4 className="font-bold text-lg relative z-10">{title}</h4>
        <p className="text-sm text-white/80 relative z-10">{description}</p>
        <ArrowRight
          aria-hidden="true"
          className="absolute bottom-5 end-5 w-5 h-5 rtl:scale-x-100 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    </Link>
  );
}

function CategoryCard({
  category,
  isSelected,
  onClick,
  postCount,
}: {
  category: ForumCategory;
  isSelected: boolean;
  onClick: () => void;
  postCount?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`Filter by category: ${category.name}`}
      className={cn(
        "w-full text-start p-3 rounded-xl transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98]",
        isSelected
          ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
          : "glass hover:bg-accent",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: category.color || "#4CAF50" }} />
          <span className="font-medium">{category.name}</span>
        </div>
        <Badge variant={isSelected ? "secondary" : "outline"} className="text-xs">
          {postCount ?? category.posts_count ?? 0}
        </Badge>
      </div>
    </button>
  );
}

function TagPill({ tag, isSelected, onClick }: { tag: ForumTag; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`Filter by tag: ${tag.name}`}
      className={cn(
        "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
        "hover:scale-105 active:scale-95",
        isSelected
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-muted hover:bg-accent border border-transparent hover:border-primary/20",
      )}
      style={!isSelected ? { borderInlineStart: `3px solid ${tag.color}` } : {}}
    >
      <Hash className="inline w-3 h-3 me-1 opacity-60" aria-hidden="true" />
      {tag.name}
    </button>
  );
}

function LeaderboardCard({ user, rank }: { user: LeaderboardUser; rank: number }) {
  const badge = LEADERBOARD_BADGES[rank - 1] || {
    icon: Star,
    color: "text-primary",
    bg: "bg-primary/10",
  };
  const BadgeIcon = badge.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-all hover:scale-[1.02]">
      <div className={`relative ${badge.bg} p-1 rounded-full`}>
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={user.nickname || "User"}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{user.nickname?.charAt(0).toUpperCase() || "?"}</span>
          </div>
        )}
        {rank <= 3 && (
          <span className={`absolute -top-1 -end-1 ${badge.color}`}>
            <BadgeIcon className="w-4 h-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{user.nickname || user.first_name || SIDEBAR_LABELS.anonymous}</p>
        <p className="text-xs text-muted-foreground">
          {`${user.postCount} ${SIDEBAR_LABELS.postsSuffix} · ${user.likesReceived} ${SIDEBAR_LABELS.likesSuffix}`}
        </p>
      </div>
      <div className="text-end">
        <p className="text-sm font-bold text-primary">{user.score}</p>
        <p className="text-xs text-muted-foreground">{SIDEBAR_LABELS.pointsLabel}</p>
      </div>
    </div>
  );
}

function TrendingPost({ post, rank }: { post: ForumPost; rank: number }) {
  const getRankStyle = (r: number): string => {
    if (r === 1) return "bg-gradient-to-r from-yellow-500 to-amber-500 text-white";
    if (r === 2) return "bg-gradient-to-r from-gray-400 to-gray-500 text-white";
    if (r === 3) return "bg-gradient-to-r from-amber-600 to-amber-700 text-white";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-all cursor-pointer group hover:translate-x-1">
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${getRankStyle(rank)}`}>
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <Link href={`/forum/${post.slug || post.id}`} className="block">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {post.forum_post_name}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-500" aria-hidden="true" />
              {post.views_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500" aria-hidden="true" />
              {post.forum_likes_counter || 0}
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}

function ActivityItem({ post, nowMs }: { post: ForumPost; nowMs: number | null }) {
  const timeAgo = formatCompactAge(post.forum_post_created_at, nowMs);

  return (
    <div className="flex items-start gap-3 py-2 animate-in fade-in slide-in-from-left-5 duration-300">
      {post.profiles?.avatar_url ? (
        <Image
          src={post.profiles.avatar_url}
          alt=""
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
          <span className="text-xs font-bold text-white">{post.profiles?.nickname?.charAt(0) || "?"}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{post.profiles?.nickname || SIDEBAR_LABELS.someone}</span>
          <span className="text-muted-foreground">{` ${SIDEBAR_LABELS.postedVerb} `}</span>
          <Link href={`/forum/${post.slug || post.id}`} className="font-medium hover:text-primary truncate">
            {`${post.forum_post_name?.slice(0, 30) || ""}...`}
          </Link>
        </p>
        {timeAgo && <p className="text-xs text-muted-foreground">{timeAgo}</p>}
      </div>
    </div>
  );
}

export function ForumFiltersSidebar({
  totalPostsCount,
  categories,
  tags,
  leaderboard,
  selectedCategory,
  onSelectCategory,
  selectedTags,
  onToggleTag,
}: {
  totalPostsCount: number;
  categories: ForumCategory[];
  tags: ForumTag[];
  leaderboard: LeaderboardUser[];
  selectedCategory: number | null;
  onSelectCategory: (id: number | null) => void;
  selectedTags: number[];
  onToggleTag: (id: number) => void;
}) {
  const t = useTranslations();

  return (
    <aside className="w-full lg:w-80 space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard
          icon={Lightbulb}
          title={t("forum_quick_actions_idea", { defaultValue: "Share Idea" })}
          description={t("forum_quick_actions_idea_desc", { defaultValue: "Start a discussion" })}
          href="/forum/new?type=discussion"
          gradient="from-amber-500 to-orange-500"
        />
        <QuickActionCard
          icon={HelpCircle}
          title={t("forum_quick_actions_question", { defaultValue: "Ask Question" })}
          description={t("forum_quick_actions_question_desc", { defaultValue: "Get help" })}
          href="/forum/new?type=question"
          gradient="from-blue-500 to-indigo-500"
        />
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" aria-hidden="true" />
          {t("forum_categories", { defaultValue: "Categories" })}
        </h3>
        <div className="space-y-2">
          <CategoryCard
            category={
              {
                id: 0,
                name: t("forum_all_categories", { defaultValue: "All Categories" }),
                slug: "all",
                color: "#6B7280",
              } as ForumCategory
            }
            isSelected={selectedCategory === null}
            onClick={() => onSelectCategory(null)}
            postCount={totalPostsCount}
          />
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              isSelected={selectedCategory === cat.id}
              onClick={() => onSelectCategory(selectedCategory === cat.id ? null : cat.id)}
            />
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" aria-hidden="true" />
          {t("forum_popular_tags", { defaultValue: "Popular Tags" })}
        </h3>
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 10).map((tag) => (
            <TagPill
              key={tag.id}
              tag={tag}
              isSelected={selectedTags.includes(tag.id)}
              onClick={() => onToggleTag(tag.id)}
            />
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" aria-hidden="true" />
          {t("forum_leaderboard", { defaultValue: "Top Contributors" })}
        </h3>
        <div className="space-y-1">
          {leaderboard.map((user, idx) => (
            <LeaderboardCard key={user.id} user={user} rank={idx + 1} />
          ))}
        </div>
      </div>
    </aside>
  );
}

export function ForumInsightsSidebar({
  trendingPosts,
  recentActivity,
}: {
  trendingPosts: ForumPost[];
  recentActivity: ForumPost[];
}) {
  const t = useTranslations();
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  return (
    <aside className="hidden xl:block w-72 space-y-6">
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" aria-hidden="true" />
          {t("forum_trending", { defaultValue: "Trending" })}
        </h3>
        <div className="space-y-1">
          {trendingPosts.map((post, idx) => (
            <TrendingPost key={post.id} post={post} rank={idx + 1} />
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" aria-hidden="true" />
          {t("forum_recent_activity", { defaultValue: "Recent Activity" })}
        </h3>
        <div className="divide-y">
          {recentActivity.map((post) => (
            <ActivityItem key={post.id} post={post} nowMs={nowMs} />
          ))}
        </div>
      </div>
    </aside>
  );
}
