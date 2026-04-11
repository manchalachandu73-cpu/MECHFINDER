// MechFinder Service Worker — Push Notifications
// Place this file at the ROOT of your web server (same level as index.html)

const CACHE_NAME = 'mechfinder-v1';

// ── Install ──────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// ── Push Event ───────────────────────────────
// Fired when the server sends a push message via web-push
self.addEventListener('push', event => {
  let data = {
    title: '🔧 MechFinder',
    body:  'You have a new update.',
    icon:  '/icon-192.png',
    badge: '/badge-72.png',
    tag:   'mechfinder',
    data:  { url: '/' }
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body:             data.body,
    icon:             data.icon,
    badge:            data.badge,
    tag:              data.tag,
    data:             data.data,
    vibrate:          [200, 100, 200],
    requireInteraction: false,
    actions: [
      { action: 'open',    title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss'  }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification Click ───────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Push Subscription Change ─────────────────
// Fires when the browser auto-rotates the push subscription
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      // Re-use the same applicationServerKey stored during initial subscribe
      applicationServerKey: event.oldSubscription
        ? event.oldSubscription.options.applicationServerKey
        : null
    }).then(newSub => {
      // Notify backend of new subscription
      return fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subscription: newSub })
      });
    })
  );
});
