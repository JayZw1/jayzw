const CACHE_NAME = "private-chat-shell-v9";
const STATIC_ASSETS = [
  "/",
  "/styles.css?v=20260605-express-panel-bubble",
  "/app.js?v=20260605-express-panel-bubble",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket.io/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data?.json() || {};
  } catch {
    data = {};
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "碎碎念收件箱", {
      body: data.body || "收到一条新消息",
      tag: data.tag || "private-chat-message",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      return self.clients.openWindow("/");
    })
  );
});
