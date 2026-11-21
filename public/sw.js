/* Healing Prayer Northwest service worker.
 * - Static build assets: cache-first (they are content-hashed).
 * - Pages: network-first. Only when the network truly fails (after one quick
 *   retry) do we fall back to the last good copy of that page, then /offline.
 * - Only successful same-origin pages are cached. Redirects (e.g. /login ->
 *   /dashboard when signed in) depend on the session, so they are never cached.
 * - Never caches API calls or other origins.
 * Bump VERSION to invalidate old caches.
 */
const VERSION = "v2"
const STATIC_CACHE = `hpn-static-${VERSION}`
const PAGE_CACHE = `hpn-pages-${VERSION}`
const OFFLINE_URL = "/offline"
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"]
const RETRY_DELAY_MS = 800

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => ![STATIC_CACHE, PAGE_CACHE].includes(k)).map((k) => caches.delete(k))
      )
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable()
      await self.clients.claim()
    })()
  )
})

const isCacheable = (res) => res && res.ok && res.type === "basic" && !res.redirected

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function handleNavigation(event) {
  const { request } = event
  try {
    const preloaded = await event.preloadResponse
    const res = preloaded || (await fetch(request))
    if (isCacheable(res)) {
      const copy = res.clone()
      event.waitUntil(caches.open(PAGE_CACHE).then((c) => c.put(request, copy)))
    }
    return res
  } catch {
    // Phones often report a failed request right after waking or switching
    // networks. Try once more before telling anyone they're offline.
    try {
      await wait(RETRY_DELAY_MS)
      return await fetch(request)
    } catch {
      const cache = await caches.open(PAGE_CACHE)
      const hit = await cache.match(request)
      return (isCacheable(hit) && hit) || (await cache.match(OFFLINE_URL)) || Response.error()
    }
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/")) return

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (isCacheable(res)) {
              const copy = res.clone()
              event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.put(request, copy)))
            }
            return res
          })
      )
    )
    return
  }

  if (request.mode === "navigate") event.respondWith(handleNavigation(event))
})
