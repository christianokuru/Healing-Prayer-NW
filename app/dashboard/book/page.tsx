import type { Metadata } from "next"
import { Suspense } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"
import { VisitorPage } from "@/features/auth/components/role-page"
import { BookingWizard } from "@/features/booking/components/booking-wizard"

export const metadata: Metadata = { title: "Book a session" }

export default function BookPage() {
  return (
    <VisitorPage>
      <Suspense fallback={<PageSkeleton />}>
        <BookingWizard />
      </Suspense>
    </VisitorPage>
  )
}
