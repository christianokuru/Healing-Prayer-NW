import type { Metadata } from "next"

import { AdminAnalytics } from "@/features/admin/components/admin-analytics"
import { AdminPage } from "@/features/auth/components/role-page"

export const metadata: Metadata = { title: "Analytics" }

export default function AdminAnalyticsPage() {
  return (
    <AdminPage>
      <AdminAnalytics />
    </AdminPage>
  )
}
