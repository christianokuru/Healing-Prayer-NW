"use client"

import { useEffect } from "react"

/**
 * The site used to register an offline service worker. It no longer does.
 * For anyone who still has the old one, remove it and its saved pages as
 * soon as the app loads (public/sw.js also removes itself when it updates).
 * Safe to delete once old installs have had time to update (a few months).
 */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => undefined)
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((k) => k.startsWith("hpn-")).map((k) => caches.delete(k))))
        .catch(() => undefined)
    }
  }, [])
  return null
}
