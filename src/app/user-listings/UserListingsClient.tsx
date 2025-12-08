'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineChevronDown,
  HiOutlineCheck,
  HiOutlineSparkles,
  HiOutlineAdjustments,
} from 'react-icons/hi';
import { HiOutlineXMark, HiOutlineFunnel } from 'react-icons/hi2';
import { ProductCard } from '@/components/productCard/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { InitialProductStateType } from '@/types/product.types';
import type { AuthUser } from '@/app/actions/auth';

interface UserListingsClientProps {
  listings: InitialProductStateType[];
  user: AuthUser;
}

type FilterStatus = 'all' | 'active' | 'inactive';
type SortOption = 'newest' | 'oldest' | 'name' | 'views';

const POST_TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
  food: { label: 'Food', emoji: '🍎' },
  thing: { label: 'Thing', emoji: '📦' },
  borrow: { label: 'Borrow', emoji: '🤝' },
  wanted: { label: 'Wanted', emoji: '🔍' },
  fridge: { label: 'Fridge', emoji: '🧊' },
  foodbank: { label: 'Food Bank', emoji: '🏦' },
  volunteer: { label: 'Volunteer', emoji: '💪' },
  challenge: { label: 'Challenge', emoji: '🏆' },
  vegan: { label: 'Vegan', emoji: '🌱' },
};

const STATUS_OPTIONS = [
  { value: 'all' as const, label: 'All Status', icon: '🔘' },
  { value: 'active' as const, label: 'Active', icon: '✅' },
  { value: 'inactive' as const, label: 'Inactive', icon: '⏸️' },
];

const SORT_OPTIONS = [
  { value: 'newest' as const, label: 'Newest First', icon: '🕐' },
  { value: 'oldest' as const, label: 'Oldest First', icon: '📅' },
  { value: 'name' as const, label: 'Name (A-Z)', icon: '🔤' },
  { value: 'views' as const, label: 'Most Popular', icon: '👁️' },
];

export function UserListingsClient({ listings }: UserListingsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isLoaded, setIsLoaded] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const postTypes = [...new Set(listings.map((l) => l.post_type))];

  const filteredListings = listings
    .filter((listing) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !listing.post_name.toLowerCase().includes(query) &&
          !listing.post_description?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (filterStatus === 'active' && !listing.is_active) return false;
      if (filterStatus === 'inactive' && listing.is_active) return false;
      if (filterType !== 'all' && listing.post_type !== filterType) return false;
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

  const activeListings = listings.filter((l) => l.is_active);
  const inactiveListings = listings.filter((l) => !l.is_active);
  const hasActiveFilters = searchQuery || filterStatus !== 'all' || filterType !== 'all';
  const activeFilterCount = [searchQuery, filterStatus !== 'all', filterType !== 'all'].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterType('all');
  };

  const currentSort = SORT_OPTIONS.find((o) => o.value === sortBy);
  const currentStatus = STATUS_OPTIONS.find((o) => o.value === filterStatus);

  // Mobile filter content (reusable)
  const FilterContent = () => (
    <div className="space-y-4">
      {/* Type Filter */}
      {postTypes.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Type</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setFilterType('all'); setMobileFiltersOpen(false); }}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200',
                filterType === 'all'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              All
            </button>
            {postTypes.map((type) => (
              <button
                key={type}
                onClick={() => { setFilterType(type); setMobileFiltersOpen(false); }}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200',
                  filterType === type
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                {POST_TYPE_CONFIG[type]?.emoji} {POST_TYPE_CONFIG[type]?.label || type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Status</label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => { setFilterStatus(option.value); setMobileFiltersOpen(false); }}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200',
                filterStatus === option.value
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {option.icon} {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Sort by</label>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => { setSortBy(option.value); setMobileFiltersOpen(false); }}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200',
                sortBy === option.value
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {option.icon} {option.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          variant="outline"
          onClick={() => { clearFilters(); setMobileFiltersOpen(false); }}
          className="w-full mt-4 rounded-xl"
        >
          <HiOutlineXMark className="h-4 w-4 mr-2" />
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="flex flex-col lg:flex-row pt-20">
        {/* Left Sidebar - Hidden on mobile */}
        <aside className={cn(
          'hidden lg:block w-72 xl:w-80 lg:h-[calc(100vh-5rem)] lg:sticky lg:top-20 lg:overflow-hidden p-4 lg:p-6',
          'transform transition-all duration-500',
          isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
        )}>
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl p-6 shadow-sm hover:shadow-lg transition-shadow duration-300">
            {/* Decorative gradient - animated */}
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 blur-3xl animate-pulse" />
            
            <div className="relative">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    My Listings
                  </h1>
                  <HiOutlineSparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage your shared items and food
                </p>
              </div>

              <Separator className="mb-6" />

              {/* Stats Grid - with hover animations */}
              <div className="grid grid-cols-3 gap-3">
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-background to-muted/50 p-4 text-center transition-all duration-300 hover:shadow-md hover:scale-105 cursor-default">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="text-2xl font-bold text-foreground tabular-nums">{listings.length}</div>
                    <div className="text-xs font-medium text-muted-foreground">Total</div>
                  </div>
                </div>
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 p-4 text-center transition-all duration-300 hover:shadow-md hover:scale-105 cursor-default">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {activeListings.length}
                    </div>
                    <div className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70">Active</div>
                  </div>
                </div>
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-background to-muted/50 p-4 text-center transition-all duration-300 hover:shadow-md hover:scale-105 cursor-default">
                  <div className="absolute inset-0 bg-gradient-to-br from-muted-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="text-2xl font-bold text-muted-foreground tabular-nums">{inactiveListings.length}</div>
                    <div className="text-xs font-medium text-muted-foreground">Inactive</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={cn(
          'flex-1 p-4 lg:p-6 lg:pl-2',
          'transform transition-all duration-500 delay-100',
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}>
          {/* Mobile Header - visible only on mobile */}
          <div className="lg:hidden mb-4 p-4 rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  My Listings
                  <HiOutlineSparkles className="h-4 w-4 text-emerald-500" />
                </h1>
                <p className="text-xs text-muted-foreground">Manage your shared items</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="tabular-nums">{listings.length} total</Badge>
              </div>
            </div>
            {/* Mobile Stats Row */}
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl bg-muted/50 p-3 text-center">
                <div className="text-lg font-bold tabular-nums">{listings.length}</div>
                <div className="text-[10px] text-muted-foreground">Total</div>
              </div>
              <div className="flex-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{activeListings.length}</div>
                <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Active</div>
              </div>
              <div className="flex-1 rounded-xl bg-muted/50 p-3 text-center">
                <div className="text-lg font-bold text-muted-foreground tabular-nums">{inactiveListings.length}</div>
                <div className="text-[10px] text-muted-foreground">Inactive</div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className={cn(
            'mb-6 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-4',
            'transform transition-all duration-500 delay-200',
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          )}>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-72 order-1">
                <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors" />
                <Input
                  placeholder="Search your listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 pl-11 pr-10 rounded-xl border-border/50 bg-background/80 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/50 transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 hover:scale-110"
                  >
                    <HiOutlineXMark className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Button */}
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="lg:hidden h-11 gap-2 rounded-xl border-border/50 bg-background/80 order-2"
                  >
                    <HiOutlineFunnel className="h-4 w-4" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-3xl">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2">
                      <HiOutlineAdjustments className="h-5 w-5" />
                      Filter & Sort
                    </SheetTitle>
                  </SheetHeader>
                  <FilterContent />
                </SheetContent>
              </Sheet>

              {/* Type Dropdown - Desktop only */}
              {postTypes.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'hidden lg:flex h-11 gap-2 rounded-xl border-border/50 bg-background/80 px-4 font-medium transition-all duration-200 hover:bg-background hover:border-border hover:scale-[1.02] order-3',
                        filterType !== 'all' &&
                          'border-emerald-500/50 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                      )}
                    >
                      <span>
                        {filterType === 'all'
                          ? '📋 All Types'
                          : `${POST_TYPE_CONFIG[filterType]?.emoji || '📦'} ${POST_TYPE_CONFIG[filterType]?.label || filterType}`}
                      </span>
                      <HiOutlineChevronDown className="h-4 w-4 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52 p-2 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
                    <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
                      Filter by type
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setFilterType('all')}
                      className="gap-3 rounded-lg cursor-pointer transition-colors"
                    >
                      <span className="text-base">📋</span>
                      <span className="flex-1 font-medium">All Types</span>
                      {filterType === 'all' && <HiOutlineCheck className="h-4 w-4 text-emerald-600" />}
                    </DropdownMenuItem>
                    {postTypes.map((type) => (
                      <DropdownMenuItem
                        key={type}
                        onClick={() => setFilterType(type)}
                        className="gap-3 rounded-lg cursor-pointer transition-colors"
                      >
                        <span className="text-base">{POST_TYPE_CONFIG[type]?.emoji || '📦'}</span>
                        <span className="flex-1 font-medium">{POST_TYPE_CONFIG[type]?.label || type}</span>
                        {filterType === type && <HiOutlineCheck className="h-4 w-4 text-emerald-600" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Status Dropdown - Desktop only */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'hidden lg:flex h-11 gap-2 rounded-xl border-border/50 bg-background/80 px-4 font-medium transition-all duration-200 hover:bg-background hover:border-border hover:scale-[1.02] order-4',
                      filterStatus !== 'all' &&
                        'border-emerald-500/50 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                    )}
                  >
                    <span>{currentStatus?.icon} {currentStatus?.label}</span>
                    <HiOutlineChevronDown className="h-4 w-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 p-2 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
                  <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
                    Filter by status
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {STATUS_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setFilterStatus(option.value)}
                      className="gap-3 rounded-lg cursor-pointer transition-colors"
                    >
                      <span className="text-base">{option.icon}</span>
                      <span className="flex-1 font-medium">{option.label}</span>
                      {filterStatus === option.value && <HiOutlineCheck className="h-4 w-4 text-emerald-600" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort Dropdown - Desktop only */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="hidden lg:flex h-11 gap-2 rounded-xl border-border/50 bg-background/80 px-4 font-medium transition-all duration-200 hover:bg-background hover:border-border hover:scale-[1.02] order-5"
                  >
                    <span>{currentSort?.icon} {currentSort?.label.split(' ')[0]}</span>
                    <HiOutlineChevronDown className="h-4 w-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 p-2 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
                  <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
                    Sort listings
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className="gap-3 rounded-lg cursor-pointer transition-colors"
                    >
                      <span className="text-base">{option.icon}</span>
                      <span className="flex-1 font-medium">{option.label}</span>
                      {sortBy === option.value && <HiOutlineCheck className="h-4 w-4 text-emerald-600" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear Filters - Desktop only */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="hidden lg:flex h-11 gap-2 rounded-xl px-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 hover:scale-[1.02] order-6"
                >
                  <HiOutlineXMark className="h-4 w-4" />
                  Clear
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {activeFilterCount}
                  </Badge>
                </Button>
              )}

              {/* Results Count */}
              <div className="ml-auto flex items-center gap-2 order-last">
                <Badge variant="outline" className="h-7 px-3 font-medium tabular-nums">
                  {filteredListings.length} of {listings.length}
                </Badge>
              </div>
            </div>
          </div>

          {/* Content */}
          {listings.length === 0 ? (
            <div className={cn(
              'flex items-center justify-center min-h-[400px]',
              'transform transition-all duration-700 delay-300',
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            )}>
              <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/80 backdrop-blur-xl p-8 sm:p-12 text-center max-w-md mx-4 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 blur-3xl animate-pulse" />
                <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-br from-teal-500/10 to-emerald-500/20 blur-3xl animate-pulse delay-1000" />
                <div className="relative">
                  <div className="text-6xl sm:text-7xl mb-6 animate-bounce">📦</div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">No listings yet</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-8 leading-relaxed">
                    Start sharing food or items with your community and make a difference!
                  </p>
                  <Link href="/food/new">
                    <Button size="lg" className="h-12 px-6 sm:px-8 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105 gap-2">
                      <HiOutlinePlus className="h-5 w-5" />
                      Create Your First Listing
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className={cn(
              'flex items-center justify-center min-h-[400px]',
              'transform transition-all duration-700 delay-300',
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            )}>
              <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/80 backdrop-blur-xl p-8 sm:p-12 text-center max-w-md mx-4 shadow-lg">
                <div className="relative">
                  <div className="text-6xl sm:text-7xl mb-6 animate-pulse">🔍</div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">No matches found</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-8 leading-relaxed">
                    Try adjusting your filters to find what you&apos;re looking for.
                  </p>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={clearFilters}
                    className="h-12 px-6 sm:px-8 rounded-xl transition-all duration-200 hover:scale-105"
                  >
                    Clear all filters
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredListings.map((listing, index) => (
                <div
                  key={listing.id}
                  className={cn(
                    'transform transition-all duration-500 hover:scale-[1.02] hover:z-10',
                    !listing.is_active && 'opacity-50 grayscale-[30%] hover:opacity-70 hover:grayscale-0',
                    isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  )}
                  style={{ 
                    transitionDelay: isLoaded ? `${Math.min(index * 50, 500)}ms` : '0ms'
                  }}
                >
                  <div className="relative group">
                    {!listing.is_active && (
                      <div className="absolute top-3 left-3 z-10">
                        <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-xs">
                          ⏸️ Inactive
                        </Badge>
                      </div>
                    )}
                    <ProductCard product={listing} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
