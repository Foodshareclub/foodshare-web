/**
 * Push Notification Service Worker
 * Handles incoming push notifications and click events
 */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: data.icon || "/logo192.png",
      badge: data.badge || "/favicon-32x32.png",
      image: data.image,
      tag: data.tag || "default",
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      renotify: data.renotify || true,
      vibrate: [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  } catch (err) {
    console.error("Push event error:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  // Handle action buttons
  if (event.action) {
    // Custom action handling
    console.log("Action clicked:", event.action);
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  // Track notification dismissals if needed
  console.log("Notification closed:", event.notification.tag);
});
