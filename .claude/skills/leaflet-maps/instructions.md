# Leaflet Maps in Next.js 16

## Overview

Interactive maps with React Leaflet in Next.js 16. Maps require client components and dynamic imports to avoid SSR issues.

## Critical: Next.js Setup

### Dynamic Import (Required)

```typescript
// src/components/leaflet/Map.tsx must be imported dynamically
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/leaflet/Map'), {
  ssr: false,
  loading: () => <MapSkeleton />
});
```

### Client Component (Required)

```typescript
// src/components/leaflet/Map.tsx
'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer } from 'react-leaflet';

export default function Map({ center, zoom }: MapProps) {
  return (
    <MapContainer center={center} zoom={zoom} className="h-full w-full">
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
}
```

## Fix Default Marker Icons

```typescript
// src/components/leaflet/MarkerIcon.ts
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
});
```

## Marker Clustering

```typescript
'use client';

import MarkerClusterGroup from 'react-leaflet-cluster';
import { Marker, Popup } from 'react-leaflet';

interface Product {
  id: string;
  latitude: number;
  longitude: number;
  post_name: string;
}

export function ProductMarkers({ products }: { products: Product[] }) {
  return (
    <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
      {products.map(product => (
        <Marker
          key={product.id}
          position={[product.latitude, product.longitude]}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold">{product.post_name}</h3>
            </div>
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}
```

## User Location

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';

export function UserLocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(coords);
        map.flyTo(coords, 13);
      },
      (error) => console.error('Geolocation error:', error),
      { enableHighAccuracy: true }
    );
  }, [map]);

  if (!position) return null;

  return (
    <Marker position={position}>
      <Popup>Your location</Popup>
    </Marker>
  );
}
```

## Map Events

```typescript
"use client";

import { useMapEvents } from "react-leaflet";

interface MapEventsProps {
  onLocationSelect?: (lat: number, lng: number) => void;
}

export function MapEvents({ onLocationSelect }: MapEventsProps) {
  useMapEvents({
    click: (e) => {
      onLocationSelect?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}
```

## Integration with Server Actions

```typescript
// Parent page (Server Component)
import { getProductsNearby } from '@/lib/data/products';

export default async function MapPage() {
  const products = await getProductsNearby({ lat: 50.0, lng: 14.4, radius: 10 });
  return <MapWrapper products={products} />;
}

// Client wrapper
'use client';

import dynamic from 'next/dynamic';
const Map = dynamic(() => import('./Map'), { ssr: false });

export function MapWrapper({ products }: { products: Product[] }) {
  return (
    <div className="h-screen">
      <Map products={products} />
    </div>
  );
}
```

## Geospatial Data from Supabase

```typescript
// In lib/data/products.ts
export async function getProductsNearby({ lat, lng, radius }: GeoParams) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("find_nearby_posts", {
    user_lat: lat,
    user_lng: lng,
    radius_km: radius,
  });
  return data ?? [];
}
```

## Styling with Tailwind

```css
/* In globals.css */
.leaflet-container {
  @apply h-full w-full rounded-lg;
}

.leaflet-popup-content-wrapper {
  @apply rounded-lg shadow-lg;
}
```

## When to Use This Skill

- Setting up maps in Next.js (dynamic import required)
- Implementing marker clustering
- Adding geolocation features
- Handling map click events
- Integrating with Supabase geospatial queries
