// Lanka Travel Map – offline support. Change VERSION after every update.
const VERSION = "lankamap-v6";
const TILES = "lankamap-tiles";
const MAX_TILES = 600;
const CORE = ["./", "index.html", "data.js", "manifest.webmanifest", "lib/leaflet.js", "lib/leaflet.css",
  "lib/leaflet.markercluster.js", "lib/MarkerCluster.css", "img/icon-192.png", "img/icon-512.png"];

self.addEventListener("install", e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim())));

async function trimTiles(){
  const c = await caches.open(TILES), keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await c.delete(keys[i]);
}
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate"){
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put("index.html", cp)); return r; })
      .catch(() => caches.match("index.html")));
    return;
  }
  if (url.host === "upload.wikimedia.org" || url.host === "tile.openstreetmap.org"){
    e.respondWith(caches.open(TILES).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === "opaque"){ c.put(req, r.clone()); trimTiles(); } return r; }))));
    return;
  }
  if (url.origin === location.origin || url.host.endsWith("gstatic.com") || url.host.endsWith("googleapis.com")){
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque"){ const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; });
      return hit || net;
    }));
  }
});
