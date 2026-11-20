const CACHE_NAME = "mini-super-store-v2";
const APP_SHELL = ["/", "/offline.html", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("mini-super-store-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        // Only the public home page is served from the app shell. Never return
        // a cached home page as if it were a private account/admin/staff route.
        if (requestUrl.pathname === "/") {
          return (await caches.match("/")) || (await caches.match("/offline.html"));
        }
        return (await caches.match("/offline.html")) || Response.error();
      }),
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => (await caches.match(request)) || Response.error()),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Mini Super Store", body: "You have a new store update." };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Mini Super Store", {
      body: data.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedUrl = event.notification.data?.url || "/";
  const target = new URL(requestedUrl, self.location.origin);
  const safeUrl = target.origin === self.location.origin ? target.href : self.location.origin + "/";
  event.waitUntil(self.clients.openWindow(safeUrl));
});