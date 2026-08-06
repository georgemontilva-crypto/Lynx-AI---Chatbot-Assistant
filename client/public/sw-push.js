/**
 * Lynx AI — Service Worker Push Handler
 * Handles Web Push notifications and notification click events.
 * This file is imported by the VitePWA-generated service worker via importScripts.
 */

// Handle incoming push events
self.addEventListener("push", function (event) {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Lynx AI",
      body: event.data.text(),
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      url: "/dashboard",
      tag: "lynx-notification",
    };
  }

  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192x192.png",
    badge: payload.badge || "/icon-192x192.png",
    tag: payload.tag || "lynx-notification",
    renotify: true,
    requireInteraction: false,
    data: {
      url: payload.url || "/dashboard",
    },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "Lynx AI", options)
  );
});

// Handle notification click — open or focus the dashboard
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (windowClients) {
        // Focus existing tab if already open
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url === fullUrl && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});
