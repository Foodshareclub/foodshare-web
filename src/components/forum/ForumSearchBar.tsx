"use client";

import type { ForumCategory, ForumTag } from "@/api/forumAPI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SortOption } from "@/lib/data/forum";
import { Clock, Filter, Flame, Heart, HelpCircle, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ForumSearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  categories: ForumCategory[];
  tags: ForumTag[];
  selectedCategory: number | null;
  onClearCategory: () => void;
  selectedTags: number[];
  onToggleTag: (tagId: number) => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}

export function ForumSearchBar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  showFilters,
  onToggleFilters,
  categories,
  tags,
  selectedCategory,
  onClearCategory,
  selectedTags,
  onToggleTag,
  hasActiveFilters,
  onClearAll,
}: ForumSearchBarProps) {
  const t = useTranslations();

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4"
            aria-hidden="true"
          />
          <Input
            placeholder={t("forum_search_placeholder", { defaultValue: "Search posts..." })}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="ps-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">
                <span className="flex items-center gap-2">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  {t("forum_sort_latest", { defaultValue: "Latest" })}
                </span>
              </SelectItem>
              <SelectItem value="hot">
                <span className="flex items-center gap-2">
                  <Flame className="w-3 h-3" aria-hidden="true" />
                  {t("forum_sort_hot", { defaultValue: "Hot" })}
                </span>
              </SelectItem>
              <SelectItem value="top">
                <span className="flex items-center gap-2">
                  <Heart className="w-3 h-3" aria-hidden="true" />
                  {t("forum_sort_top", { defaultValue: "Top" })}
                </span>
              </SelectItem>
              <SelectItem value="unanswered">
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-3 h-3" aria-hidden="true" />
                  {t("forum_sort_unanswered", { defaultValue: "Unanswered" })}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onToggleFilters}
            aria-pressed={showFilters}
            aria-label={t("forum_categories", { defaultValue: "Categories" })}
            className="lg:hidden"
          >
            <Filter className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t flex-wrap">
          <span className="text-sm text-muted-foreground">
            {t("forum_active_filters", { defaultValue: "Active filters:" })}
          </span>
          {selectedCategory && (
            <Badge variant="secondary" className="gap-1">
              {categories.find((c) => c.id === selectedCategory)?.name}
              <button
                type="button"
                onClick={onClearCategory}
                aria-label={t("forum_clear_all", { defaultValue: "Clear all" })}
                className="inline-flex items-center cursor-pointer"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {selectedTags.map((tagId) => {
            const tag = tags.find((item) => item.id === tagId);
            return tag ? (
              <Badge key={tagId} variant="secondary" className="gap-1">
                {`#${tag.name}`}
                <button
                  type="button"
                  onClick={() => onToggleTag(tagId)}
                  aria-label={t("forum_clear_all", { defaultValue: "Clear all" })}
                  className="inline-flex items-center cursor-pointer"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </Badge>
            ) : null;
          })}
          <Button type="button" variant="ghost" size="sm" onClick={onClearAll}>
            {t("forum_clear_all", { defaultValue: "Clear all" })}
          </Button>
        </div>
      )}
    </div>
  );
}
