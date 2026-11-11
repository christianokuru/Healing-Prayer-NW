import { bySlotAsc, bySlotDesc, isUpcoming } from "@/lib/domain/booking-rules"
import type { Booking } from "@/lib/domain/types"

export interface VisitorBookingGroups {
  upcoming: Booking[]
  past: Booking[]
  next?: Booking
  /** Pending reschedule requests keyed by the booking they would replace. */
  rescheduleOf: Map<string, Booking>
}

/** Splits a visitor's bookings into what's coming up and their history. */
export function groupVisitorBookings(bookings: Booking[], now: Date): VisitorBookingGroups {
  const upcoming = bookings.filter((b) => isUpcoming(b, now)).sort(bySlotAsc)
  const past = bookings.filter((b) => !isUpcoming(b, now)).sort(bySlotDesc)
  const next = upcoming.find((b) => b.status === "confirmed") ?? upcoming[0]
  const rescheduleOf = new Map(
    upcoming.filter((b) => b.rescheduleOfId && b.status === "pending").map((b) => [b.rescheduleOfId!, b])
  )
  return { upcoming, past, next, rescheduleOf }
}
