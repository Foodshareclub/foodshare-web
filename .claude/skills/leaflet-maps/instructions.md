# Leaflet Maps Development Skill

## Overview
Expert guidance for building interactive maps with React Leaflet, including marker clustering, geosearch, custom markers, and geolocation features.

## Tech Stack Context
- **Leaflet**: 1.9.4 (Core mapping library)
- **React Leaflet**: 5.0.0 (React bindings)
- **React Leaflet Cluster**: 4.0.0 (Marker clustering)
- **Leaflet Geosearch**: 4.2.2 (Location search)
- **TypeScript Types**: @types/leaflet 1.9.21

## Setup and Configuration

### Import Required CSS
```typescript
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';
```

### Basic Map Container
```typescript
import { MapContainer, TileLayer } from 'react-leaflet';

export const Map = () => {
  return (
    <MapContainer
      center={[51.505, -0.09]}
      zoom={13}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
};
```

## Core Components

### Markers and Popups
```typescript
import { Marker, Popup } from 'react-leaflet';

<Marker position={[51.505, -0.09]}>
  <Popup>
    <ProductCard product={product} />
  </Popup>
</Marker>
```

### Custom Marker Icons
```typescript
import L from 'leaflet';
import iconUrl from './marker-icon.png';

const customIcon = L.icon({
  iconUrl: iconUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -41]
});

<Marker position={position} icon={customIcon} />
```

## Marker Clustering

### Setup with React Leaflet Cluster
```typescript
import MarkerClusterGroup from 'react-leaflet-cluster';

<MapContainer center={center} zoom={zoom}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

  <MarkerClusterGroup
    chunkedLoading
    maxClusterRadius={50}
    spiderfyOnMaxZoom
    showCoverageOnHover
  >
    {products.map(product => (
      <Marker key={product.id} position={[product.lat, product.lng]}>
        <Popup>
          <ProductPopup product={product} />
        </Popup>
      </Marker>
    ))}
  </MarkerClusterGroup>
</MapContainer>
```

## Geolocation

### User Location Tracking
```typescript
import { useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';

export const UserLocationMarker = () => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        map.flyTo([latitude, longitude], 13);
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true }
    );
  }, [map]);

  return position ? (
    <Marker position={position}>
      <Popup>You are here</Popup>
    </Marker>
  ) : null;
};
```

## Geosearch Integration

### Search Control
```typescript
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

export const SearchControl = () => {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();
    const searchControl = GeoSearchControl({
      provider,
      style: 'bar',
      showMarker: true,
      autoClose: true,
      searchLabel: 'Search location...'
    });

    map.addControl(searchControl);
    return () => map.removeControl(searchControl);
  }, [map]);

  return null;
};
```

## Map Events

### Click and Movement Events
```typescript
import { useMapEvents } from 'react-leaflet';

const MapEventHandler = () => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      console.log('Clicked at:', lat, lng);
    },
    moveend: (e) => {
      const center = e.target.getCenter();
      console.log('Map center:', center);
    },
    zoomend: (e) => {
      const zoom = e.target.getZoom();
      console.log('Zoom level:', zoom);
    }
  });

  return null;
};
```

## Performance Optimization

### Filter Visible Markers
```typescript
import { useMap } from 'react-leaflet';
import { useMemo } from 'react';

const VisibleMarkers = ({ products }: Props) => {
  const map = useMap();
  const bounds = map.getBounds();

  const visibleProducts = useMemo(() => {
    return products.filter(product =>
      bounds.contains([product.lat, product.lng])
    );
  }, [products, bounds]);

  return (
    <>
      {visibleProducts.map(product => (
        <Marker key={product.id} position={[product.lat, product.lng]} />
      ))}
    </>
  );
};
```

## Common Utilities

### Distance Calculation
```typescript
import L from 'leaflet';

const calculateDistance = (
  point1: [number, number],
  point2: [number, number]
): number => {
  return L.latLng(point1).distanceTo(L.latLng(point2)); // meters
};
```

### Fit Bounds to Markers
```typescript
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const FitBounds = ({ products }: { products: Product[] }) => {
  const map = useMap();

  useEffect(() => {
    if (products.length > 0) {
      const bounds = L.latLngBounds(
        products.map(p => [p.lat, p.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [products, map]);

  return null;
};
```

## TypeScript Types

### Common Interfaces
```typescript
import { LatLngExpression } from 'leaflet';

interface MapPosition {
  center: LatLngExpression;
  zoom: number;
}

interface MarkerData {
  id: string;
  position: [number, number];
  title: string;
}

interface MapBounds {
  northEast: { lat: number; lng: number };
  southWest: { lat: number; lng: number };
}
```

## Best Practices

1. **Fix Default Icons**: Leaflet's default marker icons don't work with bundlers, configure them properly
2. **Cleanup**: Always cleanup map controls and event listeners in useEffect returns
3. **Performance**: Use clustering for large marker sets (>100 markers)
4. **Debounce**: Debounce map movement events to prevent excessive updates
5. **Bounds**: Use fitBounds to show all markers on initial load
6. **Error Handling**: Handle geolocation permission denials gracefully

## Styling Maps

### Container Styling
```css
.leaflet-container {
  height: 100%;
  width: 100%;
  border-radius: 8px;
}
```

### Custom Cluster Styling
```css
.marker-cluster {
  background-color: rgba(110, 204, 57, 0.6);
  border-radius: 50%;
  text-align: center;
  color: white;
  font-weight: bold;
}
```

## When to Use This Skill
- Setting up interactive maps
- Implementing marker clustering
- Adding geolocation features
- Creating custom markers
- Integrating location search
- Handling map events
- Optimizing map performance
- Calculating distances and bounds
- Building location-based features
