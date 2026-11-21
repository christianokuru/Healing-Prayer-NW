"use client"

import { RotateCwIcon } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

/**
 * The service worker shows the offline page *at the URL the visitor asked for*,
 * so reloading retries that page. An installed app has no reload button, so we
 * retry for them: on a tap, when the connection comes back, or when the app is
 * reopened. Never automatically on mount, to avoid a reload loop if the server
 * itself is unreachable.
 */
function retry() {
  if (window.location.pathname === "/offline") window.location.replace("/")
  else window.location.reload()
}

export function OfflineRecovery() {
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) retry()
    }
    window.addEventListener("online", retry)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.removeEventListener("online", retry)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  return (
    <Button size="lg" className="mt-8 min-w-44" onClick={retry}>
      <RotateCwIcon aria-hidden="true" />
      Try again
    </Button>
  )
}
