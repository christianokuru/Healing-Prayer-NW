import type { ReactNode } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"

import { RequireRole } from "./require-role"

/**
 * Page-level gates. Layouts always render their `{children}` (so Next.js can
 * prerender and validate every page segment); each page then shows its own
 * skeleton until the session and role are confirmed on the client.
 */
export function VisitorPage({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="visitor" fallback={<PageSkeleton />}>
      {children}
    </RequireRole>
  )
}

export function AdminPage({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="admin" fallback={<PageSkeleton />}>
      {children}
    </RequireRole>
  )
}
