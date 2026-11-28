"use client"

import { useLenis } from "lenis/react"
import { useCallback } from "react"

/**
 * Smoothly brings an element into view. Lenis only smooths mouse-wheel
 * scrolling and ignores programmatic scrolls on touch screens, so phones and
 * tablets use the browser's own smooth scroll instead.
 */
export function useScrollTo(offset = -96) {
  const lenis = useLenis()
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY + offset
      if (top > window.scrollY - 4) return // already visible above the fold
      const touch = window.matchMedia("(pointer: coarse)").matches
      if (lenis && !touch) lenis.scrollTo(el, { offset, duration: 0.8 })
      else window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
    },
    [lenis, offset]
  )
}
