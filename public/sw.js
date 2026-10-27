const CACHE = "rdv-sante-v2";

const PRECACHE = ["/", "/offline"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Les bundles JS/CSS changent à chaque build : ne les mettons jamais en cache.
  if (url.pathname.startsWith("/_next/")) {
    e.respondWith(
      fetch(req).catch(async () => (await caches.match("/offline")) || Response.error())
    );
    return;
  }

  // Pages : réseau d'abord, sinon cache, sinon /offline
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(
          async () =>
            (await caches.match(req, { ignoreSearch: true })) ||
            (await caches.match("/offline"))
        )
    );
    return;
  }

  // Fichiers statiques (images, icônes) : cache d'abord
  if (url.pathname.startsWith("/icons/") || /\.(png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }
});