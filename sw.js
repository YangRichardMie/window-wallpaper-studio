"use strict";

const cachePrefix = "stillglass-shell-";
const cacheName = cachePrefix + "1";
const home = new URL("./", self.registration.scope);
const index = new URL("index.html", home);
const assets = new Set([
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
].map(path => new URL(path, home).href));

self.addEventListener("install", event => {
  event.waitUntil(caches.open(cacheName).then(cache =>
    cache.addAll([home.href, ...assets].map(url => new Request(url, { cache: "reload" })))
  ));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName).map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate" && url.origin === home.origin &&
      (url.pathname === home.pathname || url.pathname === index.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(cacheName);
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(home.href, response.clone()).catch(() => {});
        }
        return response;
      } catch {
        return (await cache.match(home.href)) || Response.error();
      }
    })());
  } else if (assets.has(request.url)) {
    event.respondWith(caches.open(cacheName).then(async cache =>
      (await cache.match(request)) || fetch(request)
    ));
  }
});
