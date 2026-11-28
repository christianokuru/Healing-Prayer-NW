import type { ReactNode } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"

import { RequireAdmin } from "./require-admin"

/**
 * Page-level gate. Layouts always render their `{children}` (so Next.js can
 * prerender and validate every page segment); each admin page then shows its
 * own skeleton until the session is confirmed on the client.
 */
export function AdminPage({ children }: { children: ReactNode }) {
  return <RequireAdmin fallback={<PageSkeleton />}>{children}</RequireAdmin>
}
