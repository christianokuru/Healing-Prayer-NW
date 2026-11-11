"use client"

import { ReactLenis, useLenis } from "lenis/react"
import { usePathname } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

/** Elements inside these keep native scrolling (dialogs, sheets, menus). */
const preventSmoothScroll = (node: HTMLElement) =>
  !!node.closest('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"], [data-lenis-prevent]')

/**
 * Lenis for a soft, premium feel on wheel/trackpad. Touch keeps native
 * momentum scrolling (best on phones), and reduced-motion users get none.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion()
  if (reduced) return <>{children}</>
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.11,
        smoothWheel: true,
        syncTouch: false,
        anchors: { offset: -80 },
        prevent: preventSmoothScroll,
      }}
    >
      <ScrollLockSync />
      <ResetOnNavigate />
      {children}
    </ReactLenis>
  )
}

/** Pause Lenis while a modal locks page scroll, so the page can't drift behind it. */
function ScrollLockSync() {
  const lenis = useLenis()
  useEffect(() => {
    if (!lenis) return
    const html = document.documentElement
    const sync = () => {
      const locked =
        getComputedStyle(html).overflow === "hidden" || getComputedStyle(document.body).overflow === "hidden"
      if (locked) lenis.stop()
      else lenis.start()
    }
    const observer = new MutationObserver(sync)
    observer.observe(html, { attributes: true, attributeFilter: ["style", "class", "data-base-ui-scroll-locked"] })
    observer.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] })
    return () => observer.disconnect()
  }, [lenis])
  return null
}

function ResetOnNavigate() {
  const lenis = useLenis()
  const pathname = usePathname()
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true, force: true })
  }, [pathname, lenis])
  return null
}
