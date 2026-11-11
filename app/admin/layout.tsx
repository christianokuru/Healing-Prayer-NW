import { AdminShell } from "@/features/admin/components/admin-shell"

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>
}
