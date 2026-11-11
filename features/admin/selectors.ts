import { SCHEDULE } from "@/lib/config/ministry"
import { canApprove, displayStatus, occupiesSlot } from "@/lib/domain/booking-rules"
import { HOUR_MS, dateKey, sessionDaysBetween, slotEndIso, slotsForDay } from "@/lib/domain/time"
import type { AdminBooking, DisplayStatus } from "@/lib/domain/types"

/** Requests waiting for a decision, soonest session first. */
export const pendingRequests = (bookings: AdminBooking[], now: Date) =>
  bookings.filter((b) => canApprove(b, now)).sort((a, b) => a.slotStart.localeCompare(b.slotStart))

export type Urgency = "urgent" | "soon" | "later"

export function urgencyOf(slotStart: string, now: Date): Urgency {
  const hours = (new Date(slotStart).getTime() - now.getTime()) / HOUR_MS
  if (hours < SCHEDULE.minNoticeHours) return "urgent"
  if (hours < 24 * 7) return "soon"
  return "later"
}

/** The session day to feature on the overview: today (if not over) or the next one. */
export function currentSessionDay(now: Date): string {
  const [first] = sessionDaysBetween(now, new Date(now.getTime() + 8 * 24 * HOUR_MS)).filter((key) => {
    const last = slotsForDay(key).at(-1)!
    return new Date(slotEndIso(last)).getTime() > now.getTime()
  })
  return first
}

export type SlotRowState = DisplayStatus | "open" | "closed"

export interface DaySlotRow {
  start: string
  booking?: AdminBooking
  state: SlotRowState
}

/** The four slots of a day, each with the booking holding it (if any). */
export function daySlots(key: string, bookings: AdminBooking[], now: Date, blocked: boolean): DaySlotRow[] {
  const past = (iso: string) => new Date(iso).getTime() <= now.getTime()
  return slotsForDay(key).map((start) => {
    const here = bookings.filter((b) => b.slotStart === start)
    const holder = here.find(occupiesSlot) ?? here.find((b) => b.status === "cancelled_by_minister")
    if (holder) return { start, booking: holder, state: displayStatus(holder, now) }
    if (blocked) return { start, state: "closed" }
    const bookable = new Date(start).getTime() - now.getTime() >= SCHEDULE.minNoticeHours * HOUR_MS
    return { start, state: past(start) || !bookable ? "closed" : "open" }
  })
}

export function bookingsOnDay(bookings: AdminBooking[], key: string) {
  return bookings.filter((b) => dateKey(b.slotStart) === key)
}

/** Sessions that already happened, newest first: the history list. */
export function pastSessions(bookings: AdminBooking[], now: Date) {
  return bookings
    .filter((b) => new Date(b.slotStart).getTime() <= now.getTime() && b.status !== "rescheduled")
    .map((b) => ({ ...b, display: displayStatus(b, now) }))
    .sort((a, b) => b.slotStart.localeCompare(a.slotStart))
}
