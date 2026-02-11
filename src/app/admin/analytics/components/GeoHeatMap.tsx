"use client";

/**
 * Geographic Heat Map Component
 * Visualizes food sharing activity hotspots on an interactive map
 */

import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin } from "lucide-react";
import { getGeographicHotspots, type GeoHotspot } from "@/lib/data/analytics";

// Color scale for heat intensity
function getHeatColor(count: number, maxCount: number): string {
  const intensity = Math.min(count / maxCount, 1);
  if (intensity < 0.25) return "#22c55e"; // Green - low
  if (intensity < 0.5) return "#eab308"; // Yellow - medium
  if (intensity < 0.75) return "#f97316"; // Orange - high
  return "#ef4444"; // Red - very high
}

// Component to fit bounds to markers
function FitBounds({ hotspots }: { hotspots: GeoHotspot[] }) {
  const map = useMap();

  useEffect(() => {
    if (hotspots.length > 0) {
      const bounds = hotspots.map((h) => [h.latitude, h.longitude] as [number, number]);
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 10 });
      }
    }
  }, [hotspots, map]);

  return null;
}

export function GeoHeatMap() {
  const [hotspots, setHotspots] = useState<GeoHotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getGeographicHotspots();
        if (result.success && result.data) {
          setHotspots(result.data);
        } else {
          setError("Failed to load geographic data");
        }
      } catch (err) {
        setError("Failed to load geographic data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const maxCount = useMemo(() => {
    return Math.max(...hotspots.map((h) => h.count), 1);
  }, [hotspots]);

  // Default center (world view)
  const defaultCenter: [number, number] = [40, 0];
  const defaultZoom = 2;

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading map data...</span>
        </div>
      </div>
    );
  }

  if (error || hotspots.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="text-center text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>{error || "No geographic data available yet"}</p>
          <p className="text-sm mt-1">Run a sync to populate location data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[400px] rounded-lg overflow-hidden border">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds hotspots={hotspots} />
        {hotspots.map((hotspot, index) => (
          <CircleMarker
            key={`${hotspot.latitude}-${hotspot.longitude}-${index}`}
            center={[hotspot.latitude, hotspot.longitude]}
            radius={Math.max(8, Math.min(30, hotspot.count * 2))}
            fillColor={getHeatColor(hotspot.count, maxCount)}
            fillOpacity={0.7}
            stroke={true}
            color="#ffffff"
            weight={2}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{hotspot.count} listings</p>
                <p className="text-muted-foreground">{hotspot.arrangedCount} arranged</p>
                <p className="text-xs text-muted-foreground capitalize">
                  Most common: {hotspot.postType}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs shadow-lg border z-[1000]">
        <p className="font-medium mb-2">Activity Level</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Very High</span>
          </div>
        </div>
      </div>
    </div>
  );
}
