import type { Metadata } from "next"
import { Suspense } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"
import { VisitorPage } from "@/features/auth/components/role-page"
import { SessionsView } from "@/features/visitor/components/sessions-view"

export const metadata: Metadata = { title: "My sessions" }

export default function SessionsPage() {
  return (
    <VisitorPage>
      <Suspense fallback={<PageSkeleton />}>
        <SessionsView />
      </Suspense>
    </VisitorPage>
  )
}
