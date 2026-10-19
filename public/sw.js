const CACHE_NAME = "connected-static-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (!["script", "style", "image", "font"].includes(request.destination)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error("Recurso no disponible sin conexión");
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/chats";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || "Connected", {
        body: data.body || "Nuevo mensaje privado",
        icon: data.icon || "/pwa-icon.svg",
        badge: data.badge || "/pwa-icon.svg",
        data: data.data || { url: "/chats" },
        vibrate: [100, 50, 100],
      }),
    );
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Connected", {
        body: text || "Nuevo mensaje recibido",
        icon: "/pwa-icon.svg",
        badge: "/pwa-icon.svg",
      }),
    );
  }
});
