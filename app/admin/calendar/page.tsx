import type { Metadata } from "next"

import { AdminCalendar } from "@/features/admin/components/admin-calendar"
import { AdminPage } from "@/features/auth/components/role-page"

export const metadata: Metadata = { title: "Calendar" }

export default function AdminCalendarPage() {
  return (
    <AdminPage>
      <AdminCalendar />
    </AdminPage>
  )
}
