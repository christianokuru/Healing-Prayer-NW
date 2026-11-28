import type { Metadata } from "next"

import { BookingPage } from "@/features/public/components/booking-page"
import { PublicContainer } from "@/features/public/components/public-shell"

export const metadata: Metadata = { title: "Book a prayer session" }

export default function BookPage() {
  return (
    <PublicContainer>
      <BookingPage />
    </PublicContainer>
  )
}
