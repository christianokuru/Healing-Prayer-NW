import { VisitorShell } from "@/features/visitor/components/visitor-shell"

export default function VisitorLayout({ children }: LayoutProps<"/dashboard">) {
  return <VisitorShell>{children}</VisitorShell>
}
