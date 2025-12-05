'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProductCard } from '@/components/productCard/ProductCard';
import { GlassCard } from '@/components/Glass';
import { Button } from '@/components/ui/button';
import type { InitialProductStateType } from '@/types/product.types';
import type { User } from '@supabase/supabase-js';

interface UserListingsClientProps {
  listings: InitialProductStateType[];
  user: User;
}

export function UserListingsClient({ listings, user }: UserListingsClientProps) {
  const router = useRouter();

  const activeListings = listings.filter((l) => l.is_active);
  const inactiveListings = listings.filter((l) => !l.is_active);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto max-w-7xl pt-24 pb-12 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              My Listings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your shared items and food
            </p>
          </div>
          <Link href="/food/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              + Create New Listing
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <GlassCard variant="standard" className="p-4">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{listings.length}</div>
            <div className="text-sm text-muted-foreground">Total Listings</div>
          </GlassCard>
          <GlassCard variant="standard" className="p-4">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{activeListings.length}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </GlassCard>
          <GlassCard variant="standard" className="p-4">
            <div className="text-3xl font-bold text-muted-foreground">{inactiveListings.length}</div>
            <div className="text-sm text-muted-foreground">Inactive</div>
          </GlassCard>
        </div>

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <GlassCard variant="standard" className="p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No listings yet
            </h2>
            <p className="text-muted-foreground mb-6">
              Start sharing food or items with your community!
            </p>
            <Link href="/food/new">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Create Your First Listing
              </Button>
            </Link>
          </GlassCard>
        ) : (
          <>
            {/* Active Listings */}
            {activeListings.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Active Listings ({activeListings.length})
                </h2>
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {activeListings.map((listing) => (
                    <ProductCard key={listing.id} product={listing} />
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Listings */}
            {inactiveListings.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-muted-foreground mb-4">
                  Inactive Listings ({inactiveListings.length})
                </h2>
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 opacity-60">
                  {inactiveListings.map((listing) => (
                    <ProductCard key={listing.id} product={listing} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
