"use client"

import { useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export type InstallSupport = "prompt" | "ios" | "installed" | "unsupported"

const DISMISS_KEY = "hpn.install-dismissed"

function initialSupport(): InstallSupport {
  if (typeof window === "undefined") return "unsupported"
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (standalone) return "installed"
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)
  return ios ? "ios" : "unsupported"
}

function initialDismissed(): boolean {
  if (typeof window === "undefined") return true
  try {
    return localStorage.getItem(DISMISS_KEY) === "1"
  } catch {
    return false
  }
}

/** Knows whether and how this device can install the app. */
export function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [support, setSupport] = useState<InstallSupport>(initialSupport)
  const [dismissed, setDismissed] = useState(initialDismissed)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvent(e as BeforeInstallPromptEvent)
      setSupport("prompt")
    }
    const onInstalled = () => setSupport("installed")
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const install = async () => {
    if (!event) return
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === "accepted") setSupport("installed")
    setEvent(null)
  }

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // ignore
    }
  }

  return { support, install, dismissed, dismiss }
}
