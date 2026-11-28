import { PublicShell } from "@/features/public/components/public-shell"

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <PublicShell>{children}</PublicShell>
}
