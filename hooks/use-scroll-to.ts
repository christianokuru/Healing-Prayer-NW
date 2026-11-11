"use client"

import { useLenis } from "lenis/react"
import { useCallback } from "react"

/** Smoothly brings an element into view, through Lenis when it is active. */
export function useScrollTo(offset = -96) {
  const lenis = useLenis()
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY + offset
      if (top > window.scrollY - 4) return // already visible above the fold
      if (lenis) lenis.scrollTo(el, { offset, duration: 0.8 })
      else window.scrollTo({ top, behavior: "smooth" })
    },
    [lenis, offset]
  )
}
