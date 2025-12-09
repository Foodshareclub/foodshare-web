"use client";

/**
 * useBrowserNotifications Hook
 * Handles browser notification permissions and display
 */

import { useState, useEffect } from "react";

type NotificationPermission = "default" | "granted" | "denied";

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch {
      return false;
    }
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== "granted") return null;

    try {
      const notification = new Notification(title, {
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        ...options,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    } catch {
      return null;
    }
  };

  return {
    isSupported,
    permission,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
    requestPermission,
    showNotification,
  };
}
