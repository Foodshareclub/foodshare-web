'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiSearch, FiMenu, FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmationModal } from '@/components/modals/ConfirmationModal';
import { updateProduct, deleteProduct } from '@/app/actions/products';
import { cn } from '@/lib/utils';
import { isValidImageUrl } from '@/lib/image';
import type { InitialProductStateType } from '@/types/product.types';

// Lazy load the heavy modal
const PublishListingModal = dynamic(
  () => import('@/components/modals/PublishListingModal'),
  { ssr: false }
);

interface MyPostsClientProps {
  posts: InitialProductStateType[];
}

type FilterStatus = 'all' | 'active' | 'inactive';
type SortOption = 'newest' | 'oldest' | 'name' | 'views';

const POST_TYPE_LABELS: Record<string, { label: string; emoji: string; color: string; bgActive: string }> = {
  food: { label: 'Food', emoji: '🍎', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', bgActive: 'bg-orange-500/20 border-orange-500/50' },
  thing: { label: 'Thing', emoji: '📦', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', bgActive: 'bg-blue-500/20 border-blue-500/50' },
  borrow: { label: 'Borrow', emoji: '🤝', color: 'bg-green-500/10 text-green-600 dark:text-green-400', bgActive: 'bg-green-500/20 border-green-500/50' },
  wanted: { label: 'Wanted', emoji: '🔍', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', bgActive: 'bg-purple-500/20 border-purple-500/50' },
  fridge: { label: 'Fridge', emoji: '🧊', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400', bgActive: 'bg-cyan-500/20 border-cyan-500/50' },
  foodbank: { label: 'Food Bank', emoji: '🏦', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', bgActive: 'bg-amber-500/20 border-amber-500/50' },
  volunteer: { label: 'Volunteer', emoji: '💪', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400', bgActive: 'bg-pink-500/20 border-pink-500/50' },
  challenge: { label: 'Challenge', emoji: '🏆', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400', bgActive: 'bg-yellow-500/20 border-yellow-500/50' },
  vegan: { label: 'Vegan', emoji: '🌱', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', bgActive: 'bg-emerald-500/20 border-emerald-500/50' },
};

export function MyPostsClient({ posts }: MyPostsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [editingPost, setEditingPost] = useState<InitialProductStateType | null>(null);
  const [deletingPost, setDeletingPost] = useState<InitialProductStateType | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarLeft, setSidebarLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate sidebar position based on container
  useEffect(() => {
    const updateSidebarPosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSidebarLeft(rect.left);
      }
    };

    updateSidebarPosition();
    window.addEventListener('resize', updateSidebarPosition);
    return () => window.removeEventListener('resize', updateSidebarPosition);
  }, []);

  // Get unique post types from user's posts with counts
  const postTypes = [...new Set(posts.map((p) => p.post_type))];
  const typeCounts = posts.reduce((acc, post) => {
    acc[post.post_type] = (acc[post.post_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter and sort posts
  const filteredPosts = posts
    .filter((post) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !post.post_name.toLowerCase().includes(query) &&
          !post.post_description?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (filterStatus === 'active' && !post.is_active) return false;
      if (filterStatus === 'inactive' && post.is_active) return false;
      if (filterType !== 'all' && post.post_type !== filterType) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name':
          return a.post_name.localeCompare(b.post_name);
        case 'views':
          return (b.post_views || 0) - (a.post_views || 0);
        default:
          return 0;
      }
    });

  const activeCount = posts.filter((p) => p.is_active).length;
  const inactiveCount = posts.filter((p) => !p.is_active).length;
  const totalViews = posts.reduce((sum, p) => sum + (p.post_views || 0), 0);

  const handleDelete = async () => {
    if (!deletingPost) return;
    setIsDeleting(true);
    const result = await deleteProduct(deletingPost.id);
    setIsDeleting(false);
    setDeletingPost(null);
    if (result.success) {
      startTransition(() => {
        router.refresh();
      });
    } else {
      console.error('Failed to delete post:', result.error);
    }
  };

  const handleToggleStatus = async (post: InitialProductStateType) => {
    const formData = new FormData();
    formData.set('is_active', String(!post.is_active));
    startTransition(async () => {
      const result = await updateProduct(post.id, formData);
      if (result.success) {
        router.refresh();
      } else {
        console.error('Failed to toggle post status:', result.error);
      }
    });
  };

  // Category navigation content - reusable for mobile and desktop
  const categoryNavContent = (onSelect: (type: string) => void) => (
    <div className="glass rounded-xl p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Categories
      </h3>
      <nav className="space-y-1">
        <button
          onClick={() => onSelect('all')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
            'hover:bg-muted/80',
            filterType === 'all'
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'text-foreground/80'
          )}
        >
          <span className="flex items-center gap-3">
            <span className="text-lg">📋</span>
            <span>All Posts</span>
          </span>
          <Badge variant="secondary" className="text-xs">
            {posts.length}
          </Badge>
        </button>

        {postTypes.map((type) => {
          const typeInfo = POST_TYPE_LABELS[type] || {
            label: type,
            emoji: '📋',
            color: 'bg-gray-500/10 text-gray-600',
            bgActive: 'bg-gray-500/20 border-gray-500/50',
          };
          const count = typeCounts[type] || 0;
          const isActive = filterType === type;

          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                'hover:bg-muted/80',
                isActive ? cn('border', typeInfo.bgActive) : 'text-foreground/80'
              )}
            >
              <span className="flex items-center gap-3">
                <span className="text-lg">{typeInfo.emoji}</span>
                <span>{typeInfo.label}</span>
              </span>
              <Badge variant="secondary" className={cn('text-xs', isActive && typeInfo.color)}>
                {count}
              </Badge>
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <div ref={containerRef} className="container mx-auto max-w-7xl pt-24 pb-12 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Posts</h1>
            <p className="text-muted-foreground mt-1">
              Manage all your shared items and food listings
            </p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            <FiPlus className="h-4 w-4" />
            Create New Post
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-4">
            <div className="text-3xl font-bold text-foreground">{posts.length}</div>
            <div className="text-sm text-muted-foreground">Total Posts</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-3xl font-bold text-muted-foreground">{inactiveCount}</div>
            <div className="text-sm text-muted-foreground">Inactive</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalViews}</div>
            <div className="text-sm text-muted-foreground">Total Views</div>
          </div>
        </div>

        {/* Mobile Sidebar Toggle */}
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden fixed bottom-4 left-4 z-50 shadow-lg bg-background"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <FiX className="h-4 w-4" /> : <FiMenu className="h-4 w-4" />}
          <span className="ml-2">Categories</span>
        </Button>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Mobile Category Sidebar */}
        <aside
          className={cn(
            'lg:hidden fixed top-0 left-0 h-full w-64 z-40',
            'bg-background/95 backdrop-blur-lg',
            'pt-24 px-4 overflow-y-auto',
            'transform transition-transform duration-300 ease-in-out',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {categoryNavContent((type) => {
            setFilterType(type);
            setIsSidebarOpen(false);
          })}
        </aside>

        {/* Main Layout with Desktop Sidebar */}
        <div className="relative">
          {/* Desktop Category Sidebar - Fixed position */}
          <aside 
            className="hidden lg:block fixed top-24 w-56 h-[calc(100vh-6rem)] overflow-y-auto z-20"
            style={{ left: sidebarLeft > 0 ? `${sidebarLeft}px` : '1rem' }}
          >
            {categoryNavContent(setFilterType)}
          </aside>

          {/* Main Content - offset for sidebar on desktop */}
          <main className="lg:ml-60 min-w-0">
            {/* Filters */}
            <div className="glass rounded-xl p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="views">Most Views</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredPosts.length} of {posts.length} posts
                {filterType !== 'all' && (
                  <span className="ml-1">
                    in <span className="font-medium">{POST_TYPE_LABELS[filterType]?.label || filterType}</span>
                  </span>
                )}
              </p>
              {(searchQuery || filterStatus !== 'all' || filterType !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                    setFilterType('all');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>

            {/* Posts Grid */}
            {filteredPosts.length === 0 ? (
              <EmptyState
                hasFilters={searchQuery !== '' || filterStatus !== 'all' || filterType !== 'all'}
                onCreateNew={() => setIsCreateOpen(true)}
              />
            ) : (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onEdit={() => setEditingPost(post)}
                    onDelete={() => setDeletingPost(post)}
                    onToggleStatus={() => handleToggleStatus(post)}
                    isUpdating={isPending}
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        {/* Modals */}
        <PublishListingModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
        {editingPost && (
          <PublishListingModal
            product={editingPost}
            isOpen={!!editingPost}
            onClose={() => setEditingPost(null)}
          />
        )}
        <DeleteConfirmationModal
          isOpen={!!deletingPost}
          onClose={() => setDeletingPost(null)}
          onConfirm={handleDelete}
          itemName={deletingPost?.post_name || ''}
          itemType="post"
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
}


// Post Card Component
interface PostCardProps {
  post: InitialProductStateType;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  isUpdating: boolean;
}

function PostCard({ post, onEdit, onDelete, onToggleStatus, isUpdating }: PostCardProps) {
  const typeInfo = POST_TYPE_LABELS[post.post_type] || {
    label: post.post_type,
    emoji: '📋',
    color: 'bg-gray-500/10 text-gray-600',
  };

  const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={cn(
        'glass rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg',
        !post.is_active && 'opacity-60'
      )}
    >
      <Link href={`/${post.post_type}/${post.id}`} className="block relative aspect-[4/3]">
        {post.images?.length > 0 && isValidImageUrl(post.images[0]) ? (
          <Image
            src={post.images[0]}
            alt={post.post_name}
            fill
            className="object-cover transition-transform hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
            <span className="text-5xl">{typeInfo.emoji}</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge
            variant={post.is_active ? 'default' : 'secondary'}
            className={cn(
              'text-xs',
              post.is_active ? 'bg-emerald-500/90 hover:bg-emerald-500' : 'bg-gray-500/90 hover:bg-gray-500'
            )}
          >
            {post.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          <Badge className={cn('text-xs', typeInfo.color)}>
            {typeInfo.emoji} {typeInfo.label}
          </Badge>
        </div>
      </Link>
      <div className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-1 mb-1">{post.post_name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
          {post.post_stripped_address || post.post_address}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>{formattedDate}</span>
          <span>{post.post_views || 0} views</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={onEdit}>
            <FiEdit2 className="h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleStatus}
            disabled={isUpdating}
            aria-label={post.is_active ? 'Hide post' : 'Show post'}
            className="gap-1"
          >
            {post.is_active ? (
              <>
                <FiEyeOff className="h-3 w-3" />
                Hide
              </>
            ) : (
              <>
                <FiEye className="h-3 w-3" />
                Show
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            aria-label="Delete post"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <FiTrash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  hasFilters: boolean;
  onCreateNew: () => void;
}

function EmptyState({ hasFilters, onCreateNew }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">No posts found</h2>
        <p className="text-muted-foreground">
          Try adjusting your search or filters to find what you&apos;re looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-12 text-center">
      <div className="text-6xl mb-4">📦</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">No posts yet</h2>
      <p className="text-muted-foreground mb-6">
        Start sharing food or items with your community!
      </p>
      <Button onClick={onCreateNew} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
        <FiPlus className="h-4 w-4" />
        Create Your First Post
      </Button>
    </div>
  );
}
