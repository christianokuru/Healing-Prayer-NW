import type { Metadata } from "next"

import { AdminOverview } from "@/features/admin/components/admin-overview"
import { AdminPage } from "@/features/auth/components/role-page"

export const metadata: Metadata = { title: "Overview" }

export default function AdminHomePage() {
  return (
    <AdminPage>
      <AdminOverview />
    </AdminPage>
  )
}
