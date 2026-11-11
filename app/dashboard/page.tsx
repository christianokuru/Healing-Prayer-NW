import type { Metadata } from "next"

import { VisitorPage } from "@/features/auth/components/role-page"
import { VisitorHome } from "@/features/visitor/components/visitor-home"

export const metadata: Metadata = { title: "Home" }

export default function VisitorHomePage() {
  return (
    <VisitorPage>
      <VisitorHome />
    </VisitorPage>
  )
}
