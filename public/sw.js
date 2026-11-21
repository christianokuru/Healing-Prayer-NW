/* Healing Prayer Northwest: service worker removal ("kill switch").
 *
 * The site no longer uses a service worker. Phones that installed the old one
 * keep it until it is replaced, so this file must stay at /sw.js: browsers
 * check it for updates, install this version, and it then
 *   1. deletes every cache the old worker created,
 *   2. unregisters itself,
 *   3. reloads open tabs so they load straight from the network.
 * It has no fetch handler, so it never serves or blocks a page.
 * Safe to delete once old installs have had time to update (a few months).
 */
self.addEventListener("install", () => self.skipWaiting())

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: "window" })
      await Promise.all(clients.map((c) => c.navigate(c.url).catch(() => undefined)))
    })()
  )
})
