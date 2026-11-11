"use client"

import { useMediaQuery } from "./use-media-query"

export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)")
