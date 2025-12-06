'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ForumPostCard } from '@/components/forum';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import type { ForumPost, ForumCategory, ForumTag } from '@/api/forumAPI';
import {
  FaPlus, FaSearch, FaFire, FaClock, FaCommentDots, FaHeart,
  FaChartLine, FaFilter, FaTimes, FaBookmark, FaUsers,
  FaLightbulb, FaQuestion, FaBullhorn, FaBook,
} from 'react-icons/fa';

type SortOption = 'latest' | 'hot' | 'top' | 'unanswered';

const POST_TYPE_CONFIG = {
  discussion: { icon: FaCommentDots, label: 'Discussions', color: 'bg-slate-500' },
  question: { icon: FaQuestion, label: 'Questions', color: 'bg-amber-500' },
  announcement: { icon: FaBullhorn, label: 'Announcements', color: 'bg-blue-500' },
  guide: { icon: FaBook, label: 'Guides', color: 'bg-emerald-500' },
};

function ForumSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden bg-card">
          <Skeleton className="h-48 w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <motion.div whileHover={{ y: -2 }} className="glass rounded-xl p-4 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}


function CategoryCard({ category, isSelected, onClick }: {
  category: ForumCategory; isSelected: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl transition-all ${
        isSelected ? 'bg-primary text-primary-foreground shadow-lg' : 'glass hover:bg-accent'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color || '#4CAF50' }} />
          <span className="font-medium">{category.name}</span>
        </div>
        <Badge variant="secondary" className="text-xs">{category.posts_count || 0}</Badge>
      </div>
    </motion.button>
  );
}

function TagPill({ tag, isSelected, onClick }: {
  tag: ForumTag; isSelected: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
      }`}
      style={!isSelected ? { borderLeft: `3px solid ${tag.color}` } : {}}
    >
      #{tag.name}
    </motion.button>
  );
}

export default function ForumPage() {
  const t = useTranslations();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [tags, setTags] = useState<ForumTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedPostType, setSelectedPostType] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalPosts: 0, totalComments: 0, activeUsers: 0, postsToday: 0 });

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: postsData } = await supabase
        .from('forum')
        .select(`*, profiles!forum_profile_id_profiles_fkey (id, nickname, first_name, second_name, avatar_url),
          forum_categories!forum_category_id_fkey (*), forum_post_tags (forum_tags (*))`)
        .eq('forum_published', true)
        .order('is_pinned', { ascending: false })
        .order('last_activity_at', { ascending: false, nullsFirst: false })
        .limit(50);

      const { data: categoriesData } = await supabase
        .from('forum_categories').select('*').eq('is_active', true).order('sort_order', { ascending: true });

      const { data: tagsData } = await supabase
        .from('forum_tags').select('*').order('usage_count', { ascending: false }).limit(20);

      setPosts((postsData ?? []) as ForumPost[]);
      setCategories((categoriesData ?? []) as ForumCategory[]);
      setTags((tagsData ?? []) as ForumTag[]);

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const postsToday = (postsData ?? []).filter(p => new Date(p.forum_post_created_at) >= today).length;
      setStats({
        totalPosts: postsData?.length || 0,
        totalComments: (postsData ?? []).reduce((acc, p) => acc + (Number(p.forum_comments_counter) || 0), 0),
        activeUsers: new Set((postsData ?? []).map(p => p.profile_id)).size,
        postsToday,
      });
      setLoading(false);
    }
    fetchData();
  }, []);


  const filteredPosts = useMemo(() => {
    let result = [...posts];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => p.forum_post_name?.toLowerCase().includes(query) || p.forum_post_description?.toLowerCase().includes(query));
    }
    if (selectedCategory) result = result.filter(p => p.category_id === selectedCategory);
    if (selectedPostType) result = result.filter(p => p.post_type === selectedPostType);
    if (selectedTags.length > 0) result = result.filter(p => p.forum_post_tags?.some(t => selectedTags.includes(t.forum_tags.id)));

    switch (sortBy) {
      case 'hot': result.sort((a, b) => (Number(b.hot_score) || 0) - (Number(a.hot_score) || 0)); break;
      case 'top': result.sort((a, b) => (b.forum_likes_counter || 0) - (a.forum_likes_counter || 0)); break;
      case 'unanswered':
        result = result.filter(p => p.post_type === 'question' && !p.best_answer_id);
        result.sort((a, b) => new Date(b.forum_post_created_at).getTime() - new Date(a.forum_post_created_at).getTime());
        break;
      default:
        result.sort((a, b) => new Date(b.last_activity_at || b.forum_post_created_at).getTime() - new Date(a.last_activity_at || a.forum_post_created_at).getTime());
    }
    const pinned = result.filter(p => p.is_pinned);
    const unpinned = result.filter(p => !p.is_pinned);
    return [...pinned, ...unpinned];
  }, [posts, searchQuery, sortBy, selectedCategory, selectedTags, selectedPostType]);

  const clearFilters = () => { setSearchQuery(''); setSelectedCategory(null); setSelectedTags([]); setSelectedPostType(null); setSortBy('latest'); };
  const hasActiveFilters = searchQuery || selectedCategory || selectedTags.length > 0 || selectedPostType;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 p-8 md:p-12 mb-8">
          <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('forum_title')}</h1>
                <p className="text-white/80 text-lg max-w-xl">{t('forum_description')}</p>
              </div>
              <Button asChild size="lg" className="bg-white text-green-600 hover:bg-white/90 shadow-xl">
                <Link href="/forum/new"><FaPlus className="mr-2 h-4 w-4" />{t('new_post')}</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <StatCard icon={FaCommentDots} label="Total Posts" value={stats.totalPosts} color="bg-white/20" />
              <StatCard icon={FaHeart} label="Comments" value={stats.totalComments} color="bg-white/20" />
              <StatCard icon={FaUsers} label="Contributors" value={stats.activeUsers} color="bg-white/20" />
              <StatCard icon={FaLightbulb} label="Today" value={stats.postsToday} color="bg-white/20" />
            </div>
          </div>
        </motion.div>


        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <motion.aside initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:w-72 shrink-0 space-y-6">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Search discussions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-card" />
            </div>

            <div className="glass rounded-2xl p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><FaBookmark className="w-4 h-4 text-primary" />Categories</h3>
              <div className="space-y-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${!selectedCategory ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-accent'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">All Categories</span>
                    <Badge variant="secondary">{posts.length}</Badge>
                  </div>
                </motion.button>
                {categories.map((cat) => (
                  <CategoryCard key={cat.id} category={cat} isSelected={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)} />
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><FaFilter className="w-4 h-4 text-primary" />Post Types</h3>
              <div className="space-y-2">
                {Object.entries(POST_TYPE_CONFIG).map(([type, config]) => {
                  const Icon = config.icon;
                  const count = posts.filter((p) => p.post_type === type).length;
                  return (
                    <motion.button key={type} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedPostType(selectedPostType === type ? null : type)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${selectedPostType === type ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${config.color}`}><Icon className="w-3 h-3 text-white" /></div>
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="glass rounded-2xl p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><FaChartLine className="w-4 h-4 text-primary" />Popular Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 10).map((tag) => (
                  <TagPill key={tag.id} tag={tag} isSelected={selectedTags.includes(tag.id)}
                    onClick={() => setSelectedTags((prev) => prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id])} />
                ))}
              </div>
            </div>
          </motion.aside>


          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="Sort by" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest"><div className="flex items-center gap-2"><FaClock className="w-4 h-4" />Latest</div></SelectItem>
                    <SelectItem value="hot"><div className="flex items-center gap-2"><FaFire className="w-4 h-4" />Hot</div></SelectItem>
                    <SelectItem value="top"><div className="flex items-center gap-2"><FaHeart className="w-4 h-4" />Top</div></SelectItem>
                    <SelectItem value="unanswered"><div className="flex items-center gap-2"><FaQuestion className="w-4 h-4" />Unanswered</div></SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    <FaTimes className="w-3 h-3 mr-1" />Clear filters
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}</p>
            </div>

            <AnimatePresence>
              {hasActiveFilters && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2 mb-6">
                  {selectedCategory && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedCategory(null)}>
                      {categories.find((c) => c.id === selectedCategory)?.name}<FaTimes className="w-3 h-3 ml-1" />
                    </Badge>
                  )}
                  {selectedPostType && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedPostType(null)}>
                      {POST_TYPE_CONFIG[selectedPostType as keyof typeof POST_TYPE_CONFIG]?.label}<FaTimes className="w-3 h-3 ml-1" />
                    </Badge>
                  )}
                  {selectedTags.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    return tag ? (
                      <Badge key={tagId} variant="secondary" className="cursor-pointer" onClick={() => setSelectedTags((prev) => prev.filter((id) => id !== tagId))}>
                        #{tag.name}<FaTimes className="w-3 h-3 ml-1" />
                      </Badge>
                    ) : null;
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <ForumSkeleton />
            ) : filteredPosts.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 glass rounded-2xl">
                <FaCommentDots className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No posts found</h3>
                <p className="text-muted-foreground mb-6">{hasActiveFilters ? 'Try adjusting your filters or search query' : 'Be the first to start a discussion!'}</p>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
                ) : (
                  <Button asChild><Link href="/forum/new"><FaPlus className="mr-2 h-4 w-4" />Create Post</Link></Button>
                )}
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredPosts.map((post, index) => (
                  <ForumPostCard key={post.id} post={post} index={index} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
