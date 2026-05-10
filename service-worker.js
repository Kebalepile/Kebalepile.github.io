const CACHE_NAME = "yahneh-shell-v52";
const ICON_ASSET_VERSION = "20260508-3";
const STYLE_ASSET_VERSION = "20260509-46";
const APP_SHELL = [
  "./",
  "./index.html",
  "./runtime-config.js",
  `./manifest.webmanifest?v=${ICON_ASSET_VERSION}`,
  `./styles/main.css?v=${STYLE_ASSET_VERSION}`,
  `./assets/logo/yahneh-pwa-circle-192.png?v=${ICON_ASSET_VERSION}`,
  `./assets/logo/yahneh-pwa-circle-512.png?v=${ICON_ASSET_VERSION}`,
  `./assets/logo/yahneh-apple-touch-circle-180.png?v=${ICON_ASSET_VERSION}`
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isRuntimeConfigRequest(request) {
  try {
    const requestUrl = new URL(request.url);
    return requestUrl.origin === self.location.origin && requestUrl.pathname.endsWith("/runtime-config.js");
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (isRuntimeConfigRequest(event.request)) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone)).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);

          return (
            cached ||
            new Response("window.BOITEKONG_PULSE_CONFIG = window.BOITEKONG_PULSE_CONFIG || {};\n", {
              headers: {
                "Content-Type": "text/javascript; charset=utf-8",
                "Cache-Control": "no-store"
              }
            })
          );
        })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone)).catch(() => {});
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached || caches.match("./index.html");
      })
  );
});
