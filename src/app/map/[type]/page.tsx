import { Suspense } from 'react';
import { getProductLocations } from '@/app/actions/products';
import { getUser } from '@/app/actions/auth';
import { MapClient } from './MapClient';
import { urlToDbType } from '@/utils/categoryMapping';

interface PageProps {
  params: Promise<{ type: string }>;
}

/**
 * Map Page - Server Component
 * Fetches product locations on the server and passes to MapClient
 */
export default async function MapPage({ params }: PageProps) {
  const { type = 'food' } = await params;

  // Convert URL slug to database type
  const dbType = urlToDbType(type);

  // Fetch data in parallel on the server
  const [locations, user] = await Promise.all([
    getProductLocations(dbType),
    getUser(),
  ]);

  return (
    <Suspense fallback={<MapPageSkeleton type={type} />}>
      <MapClient type={type} initialLocations={locations} user={user} />
    </Suspense>
  );
}

/**
 * Skeleton loader for the map page
 */
function MapPageSkeleton({ type }: { type: string }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar skeleton */}
      <div className="h-[140px] bg-card border-b border-border animate-pulse" />

      {/* Map skeleton */}
      <div
        className="relative"
        style={{
          height: 'calc(100vh - 140px)',
          width: '100%',
        }}
      >
        <div className="h-full w-full animate-pulse bg-muted flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <p className="text-muted-foreground">Loading {type} map...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
