'use client';

import { useEffect, useRef, useState } from "react";
import { useMapEvents } from "react-leaflet";

interface MapPositionTrackerProps {
  category: string;
  onPositionChange: (center: [number, number], zoom: number) => void;
}

const MapPositionTracker: React.FC<MapPositionTrackerProps> = ({
  category,
  onPositionChange,
}) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const map = useMapEvents({
    moveend() {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        
        onPositionChange([center.lat, center.lng], zoom);
        
        // Save to backend
        try {
          await fetch('/api/map-services/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              center: { lat: center.lat, lng: center.lng },
              zoom,
              platform: 'web',
              deviceId: getDeviceId()
            })
          });

          // Broadcast via WebSocket
          if (wsRef.current && isConnected) {
            wsRef.current.send(JSON.stringify({
              type: 'map_sync',
              platform: 'web',
              deviceId: getDeviceId(),
              center: { lat: center.lat, lng: center.lng },
              zoom
            }));
          }
        } catch (error) {
          console.error('Failed to save map preferences:', error);
        }
      }, 1000);
    },
  });

  useEffect(() => {
    // Setup WebSocket for real-time sync
    const setupWebSocket = () => {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/map-services/sync`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        // Authenticate
        ws.send(JSON.stringify({
          type: 'auth',
          userId: getCurrentUserId()
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'map_preferences_updated' && data.platform !== 'web') {
            // Update map from remote device
            const { center, zoom } = data.preferences;
            map.setView([center.lat, center.lng], zoom);
            onPositionChange([center.lat, center.lng], zoom);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Reconnect after delay
        setTimeout(setupWebSocket, 5000);
      };

      wsRef.current = ws;
    };

    setupWebSocket();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [map, onPositionChange]);

  return null;
};

function getDeviceId(): string {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

function getCurrentUserId(): string {
  // Get from auth context or session
  return localStorage.getItem('userId') || 'anonymous';
}

export default MapPositionTracker;
