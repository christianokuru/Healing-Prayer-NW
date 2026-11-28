import type { Metadata } from "next"

import { NotesPage } from "@/features/admin/components/notes/notes-page"
import { AdminPage } from "@/features/auth/components/role-page"

export const metadata: Metadata = { title: "Notes" }

export default function AdminNotesPage() {
  return (
    <AdminPage>
      <NotesPage />
    </AdminPage>
  )
}
