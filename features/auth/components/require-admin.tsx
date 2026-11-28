"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { writeRoleCookie } from "@/lib/auth/session-cookie"

import { useSession } from "../hooks"

interface RequireAdminProps {
  /** Shown while the session is being checked or a redirect is happening. */
  fallback: ReactNode
  children: ReactNode
}

/**
 * Client-side gate for the admin area. `proxy.ts` already redirects
 * optimistically; this confirms the session.
 */
export function RequireAdmin({ fallback, children }: RequireAdminProps) {
  const { data: user, isPending, isError } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const allowed = user?.role === "admin"

  useEffect(() => {
    if (isPending || allowed) return
    writeRoleCookie(null)
    router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [isPending, isError, allowed, router, pathname])

  return allowed ? <>{children}</> : <>{fallback}</>
}
