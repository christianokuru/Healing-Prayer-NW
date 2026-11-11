import type { Metadata } from "next"
import { Suspense } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"
import { AdminHistory } from "@/features/admin/components/admin-history"
import { AdminPage } from "@/features/auth/components/role-page"

export const metadata: Metadata = { title: "History" }

export default function AdminHistoryPage() {
  return (
    <AdminPage>
      <Suspense fallback={<PageSkeleton />}>
        <AdminHistory />
      </Suspense>
    </AdminPage>
  )
}
