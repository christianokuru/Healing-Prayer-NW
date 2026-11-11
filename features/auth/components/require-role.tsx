"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { homeFor, writeRoleCookie } from "@/lib/auth/session-cookie"
import type { Role } from "@/lib/domain/types"

import { useSession } from "../hooks"

interface RequireRoleProps {
  role: Role
  /** Shown while the session is being checked or a redirect is happening. */
  fallback: ReactNode
  children: ReactNode
}

/**
 * Client-side gate for signed-in areas. `proxy.ts` already redirects
 * optimistically; this confirms the session and the role.
 */
export function RequireRole({ role, fallback, children }: RequireRoleProps) {
  const { data: user, isPending, isError } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const allowed = !!user && user.role === role

  useEffect(() => {
    if (isPending) return
    if (!user || isError) {
      writeRoleCookie(null)
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    } else if (user.role !== role) {
      router.replace(homeFor(user.role))
    }
  }, [isPending, isError, user, role, router, pathname])

  return allowed ? <>{children}</> : <>{fallback}</>
}
