"use client";

import type { ForumCategory, ForumPost, ForumTag } from "@/api/forumAPI";
import { ForumPostCard } from "@/components/forum/ForumPostCard";
import { ForumSearchBar } from "@/components/forum/ForumSearchBar";
import { ForumFiltersSidebar, ForumInsightsSidebar } from "@/components/forum/ForumSidebar";
import { Button } from "@/components/ui/button";
import type { ForumStats, LeaderboardUser, SortOption } from "@/lib/data/forum";
import { MessageCircle, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

interface ForumPageClientProps {
  posts: ForumPost[];
  categories: ForumCategory[];
  tags: ForumTag[];
  stats: ForumStats;
  leaderboard: LeaderboardUser[];
  trendingPosts: ForumPost[];
  recentActivity: ForumPost[];
}

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

  const filteredPosts = posts.filter((post) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = post.forum_post_name?.toLowerCase().includes(query);
      const matchesDesc = post.forum_post_description?.toLowerCase().includes(query);
      if (!matchesName && !matchesDesc) return false;
    }

    if (selectedCategory && post.category_id !== selectedCategory) return false;
    if (selectedPostType && post.post_type !== selectedPostType) return false;

    if (selectedTags.length > 0) {
      const postTagIds = post.forum_post_tags?.map((pt) => pt.forum_tags?.id) || [];
      if (!selectedTags.some((tagId) => postTagIds.includes(tagId))) return false;
    }

    return true;
  });

  const sortedPosts = filteredPosts.toSorted((a, b) => {
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
        return new Date(b.forum_post_created_at).getTime() - new Date(a.forum_post_created_at).getTime();
    }
  });

  const hasActiveFilters = Boolean(selectedCategory || selectedTags.length > 0 || selectedPostType || searchQuery);

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedTags([]);
    setSelectedPostType(null);
    setSearchQuery("");
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className={showFilters ? "block" : "hidden lg:block"}>
            <ForumFiltersSidebar
              totalPostsCount={posts.length}
              categories={categories}
              tags={tags}
              leaderboard={leaderboard}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedTags={selectedTags}
              onToggleTag={toggleTag}
            />
          </div>

          <div className="flex-1 min-w-0">
            <ForumSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters((prev) => !prev)}
              categories={categories}
              tags={tags}
              selectedCategory={selectedCategory}
              onClearCategory={() => setSelectedCategory(null)}
              selectedTags={selectedTags}
              onToggleTag={toggleTag}
              hasActiveFilters={hasActiveFilters}
              onClearAll={clearFilters}
            />

            {sortedPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedPosts.map((post, index) => (
                  <ForumPostCard key={post.id} post={post} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" aria-hidden="true" />
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
                    <Plus className="w-4 h-4 me-2" aria-hidden="true" />
                    {t("forum_create_first", { defaultValue: "Create First Post" })}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <ForumInsightsSidebar trendingPosts={trendingPosts} recentActivity={recentActivity} />
        </div>
      </div>
    </div>
  );
}
