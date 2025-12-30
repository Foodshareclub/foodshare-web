"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Plus,
  Search,
  Flame,
  Clock,
  MessageCircle,
  Heart,
  Filter,
  X,
  Lightbulb,
  HelpCircle,
  Trophy,
  Star,
  Medal,
  Crown,
  ArrowUp,
  ArrowRight,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ForumPostCard } from "@/components/forum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ForumPost, ForumCategory, ForumTag } from "@/api/forumAPI";
import type { ForumStats, LeaderboardUser, SortOption } from "@/lib/data/forum";

// ============================================================================
// Constants
// ============================================================================

const LEADERBOARD_BADGES = [
  { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { icon: Medal, color: "text-gray-400", bg: "bg-gray-400/10" },
  { icon: Medal, color: "text-amber-600", bg: "bg-amber-600/10" },
] as const;

// ============================================================================
// Props
// ============================================================================

interface ForumPageClientProps {
  posts: ForumPost[];
  categories: ForumCategory[];
  tags: ForumTag[];
  stats: ForumStats;
  leaderboard: LeaderboardUser[];
  trendingPosts: ForumPost[];
  recentActivity: ForumPost[];
}

// ============================================================================
// Sub-components
// ============================================================================

function _StatCard({
  icon: Icon,
  label,
  value,
  color,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  trend?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 bg-white/10 backdrop-blur-md border border-white/20 transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.02]">
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="relative z-10 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color} shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-white/70">{label}</p>
            {trend !== undefined && trend > 0 && (
              <span className="text-xs text-green-400 flex items-center gap-0.5">
                <ArrowUp className="w-2 h-2" />+{trend}%
              </span>
            )}
          </div>
        </div>
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
      <span
        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${getRankStyle(rank)}`}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <Link href={`/forum/${post.slug || post.id}`} className="block">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {post.forum_post_name}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-500" />
              {post.views_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500" />
              {post.forum_likes_counter || 0}
            </span>
          </div>
        </Link>
      </div>
    </div>
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
            <span className="text-sm font-bold text-white">
              {user.nickname?.charAt(0).toUpperCase() || "?"}
            </span>
          </div>
        )}
        {rank <= 3 && (
          <span className={`absolute -top-1 -right-1 ${badge.color}`}>
            <BadgeIcon className="w-4 h-4" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">
          {user.nickname || user.first_name || "Anonymous"}
        </p>
        <p className="text-xs text-muted-foreground">
          {user.postCount} posts · {user.likesReceived} likes
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-primary">{user.score}</p>
        <p className="text-xs text-muted-foreground">points</p>
      </div>
    </div>
  );
}

function ActivityItem({ post }: { post: ForumPost }) {
  const timeAgo = (() => {
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - new Date(post.forum_post_created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  })();

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
          <span className="text-xs font-bold text-white">
            {post.profiles?.nickname?.charAt(0) || "?"}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{post.profiles?.nickname || "Someone"}</span>
          <span className="text-muted-foreground"> posted </span>
          <Link
            href={`/forum/${post.slug || post.id}`}
            className="font-medium hover:text-primary truncate"
          >
            {post.forum_post_name?.slice(0, 30)}...
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>
    </div>
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
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`Filter by category: ${category.name}`}
      className={cn(
        "w-full text-left p-3 rounded-xl transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98]",
        isSelected
          ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
          : "glass hover:bg-accent"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full shadow-sm"
            style={{ backgroundColor: category.color || "#4CAF50" }}
          />
          <span className="font-medium">{category.name}</span>
        </div>
        <Badge variant={isSelected ? "secondary" : "outline"} className="text-xs">
          {postCount ?? category.posts_count ?? 0}
        </Badge>
      </div>
    </button>
  );
}

function TagPill({
  tag,
  isSelected,
  onClick,
}: {
  tag: ForumTag;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`Filter by tag: ${tag.name}`}
      className={cn(
        "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
        "hover:scale-105 active:scale-95",
        isSelected
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-muted hover:bg-accent border border-transparent hover:border-primary/20"
      )}
      style={!isSelected ? { borderLeft: `3px solid ${tag.color}` } : {}}
    >
      <Hash className="inline w-3 h-3 mr-1 opacity-60" />
      {tag.name}
    </button>
  );
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
          gradient
        )}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
        <Icon className="w-8 h-8 mb-3 relative z-10" />
        <h4 className="font-bold text-lg relative z-10">{title}</h4>
        <p className="text-sm text-white/80 relative z-10">{description}</p>
        <ArrowRight className="absolute bottom-5 right-5 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ForumPageClient({
  posts,
  categories,
  tags,
  stats: _stats,
  leaderboard,
  trendingPosts,
  recentActivity,
}: ForumPageClientProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedPostType, setSelectedPostType] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter posts based on current filters
  const filteredPosts = posts.filter((post) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = post.forum_post_name?.toLowerCase().includes(query);
      const matchesDesc = post.forum_post_description?.toLowerCase().includes(query);
      if (!matchesName && !matchesDesc) return false;
    }

    // Category filter
    if (selectedCategory && post.category_id !== selectedCategory) return false;

    // Post type filter
    if (selectedPostType && post.post_type !== selectedPostType) return false;

    // Tags filter
    if (selectedTags.length > 0) {
      const postTagIds = post.forum_post_tags?.map((pt) => pt.forum_tags?.id) || [];
      if (!selectedTags.some((tagId) => postTagIds.includes(tagId))) return false;
    }

    return true;
  });

  // Sort filtered posts
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sortBy) {
      case "hot":
        return (b.hot_score || 0) - (a.hot_score || 0);
      case "top":
        return (b.forum_likes_counter || 0) - (a.forum_likes_counter || 0);
      case "unanswered":
        if (a.post_type === "question" && !a.best_answer_id) return -1;
        if (b.post_type === "question" && !b.best_answer_id) return 1;
        return 0;
      default:
        return (
          new Date(b.forum_post_created_at).getTime() - new Date(a.forum_post_created_at).getTime()
        );
    }
  });

  const hasActiveFilters =
    selectedCategory || selectedTags.length > 0 || selectedPostType || searchQuery;

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedTags([]);
    setSelectedPostType(null);
    setSearchQuery("");
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-80 space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <QuickActionCard
                icon={Lightbulb}
                title={t("forum_quick_actions_idea", { defaultValue: "Share Idea" })}
                description={t("forum_quick_actions_idea_desc", {
                  defaultValue: "Start a discussion",
                })}
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

            {/* Categories */}
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
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
                  onClick={() => setSelectedCategory(null)}
                  postCount={posts.length}
                />
                {categories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    isSelected={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  />
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
                {t("forum_popular_tags", { defaultValue: "Popular Tags" })}
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 10).map((tag) => (
                  <TagPill
                    key={tag.id}
                    tag={tag}
                    isSelected={selectedTags.includes(tag.id)}
                    onClick={() => toggleTag(tag.id)}
                  />
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                {t("forum_leaderboard", { defaultValue: "Top Contributors" })}
              </h3>
              <div className="space-y-1">
                {leaderboard.map((user, idx) => (
                  <LeaderboardCard key={user.id} user={user} rank={idx + 1} />
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1">
            {/* Search & Filters Bar */}
            <div className="bg-card rounded-2xl p-4 shadow-sm mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder={t("forum_search_placeholder", { defaultValue: "Search posts..." })}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">
                        <span className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />{" "}
                          {t("forum_sort_latest", { defaultValue: "Latest" })}
                        </span>
                      </SelectItem>
                      <SelectItem value="hot">
                        <span className="flex items-center gap-2">
                          <Flame className="w-3 h-3" />{" "}
                          {t("forum_sort_hot", { defaultValue: "Hot" })}
                        </span>
                      </SelectItem>
                      <SelectItem value="top">
                        <span className="flex items-center gap-2">
                          <Heart className="w-3 h-3" />{" "}
                          {t("forum_sort_top", { defaultValue: "Top" })}
                        </span>
                      </SelectItem>
                      <SelectItem value="unanswered">
                        <span className="flex items-center gap-2">
                          <HelpCircle className="w-3 h-3" />{" "}
                          {t("forum_sort_unanswered", { defaultValue: "Unanswered" })}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden"
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    {t("forum_active_filters", { defaultValue: "Active filters:" })}
                  </span>
                  {selectedCategory && (
                    <Badge variant="secondary" className="gap-1">
                      {categories.find((c) => c.id === selectedCategory)?.name}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setSelectedCategory(null)}
                      />
                    </Badge>
                  )}
                  {selectedTags.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    return tag ? (
                      <Badge key={tagId} variant="secondary" className="gap-1">
                        #{tag.name}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => toggleTag(tagId)} />
                      </Badge>
                    ) : null;
                  })}
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    {t("forum_clear_all", { defaultValue: "Clear all" })}
                  </Button>
                </div>
              )}
            </div>

            {/* Posts Grid */}
            {sortedPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedPosts.map((post, index) => (
                  <div
                    key={post.id}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-300"
                    style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                  >
                    <ForumPostCard post={post} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {t("forum_no_posts", { defaultValue: "No posts found" })}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t("forum_no_posts_desc", {
                    defaultValue: "Try adjusting your filters or be the first to post!",
                  })}
                </p>
                <Link href="/forum/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("forum_create_first", { defaultValue: "Create First Post" })}
                  </Button>
                </Link>
              </div>
            )}
          </main>

          {/* Right Sidebar - Trending & Activity */}
          <aside className="hidden xl:block w-72 space-y-6">
            {/* Trending */}
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                {t("forum_trending", { defaultValue: "Trending" })}
              </h3>
              <div className="space-y-1">
                {trendingPosts.map((post, idx) => (
                  <TrendingPost key={post.id} post={post} rank={idx + 1} />
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                {t("forum_recent_activity", { defaultValue: "Recent Activity" })}
              </h3>
              <div className="divide-y">
                {recentActivity.map((post) => (
                  <ActivityItem key={post.id} post={post} />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
