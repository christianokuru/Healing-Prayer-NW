"use client"

import { useEffect } from "react"

/** Registers the PWA service worker in production builds only. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Non-fatal: the site works without offline support.
    })
  }, [])
  return null
}
