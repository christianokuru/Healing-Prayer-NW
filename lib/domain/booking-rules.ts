import { SCHEDULE } from "@/lib/config/ministry"
import type {
  BlockedDate,
  Booking,
  BookingStatus,
  DisplayStatus,
  ThursdayAvailability,
} from "@/lib/domain/types"
import {
  HOUR_MS,
  bookingWindow,
  dateKey,
  sessionDaysBetween,
  slotEndIso,
  slotsForDay,
} from "@/lib/domain/time"

/**
 * Pure booking rules. The backend is the source of truth and enforces
 * these too; the UI uses them for instant, friendly feedback.
 */

const ACTIVE: BookingStatus[] = ["pending", "confirmed"]
/** Statuses that keep a slot unavailable to others. */
const OCCUPYING: BookingStatus[] = ["pending", "confirmed", "no_show"]

export const isActive = (b: Pick<Booking, "status">) => ACTIVE.includes(b.status)
export const occupiesSlot = (b: Pick<Booking, "status">) => OCCUPYING.includes(b.status)

const hoursUntil = (iso: string, now: Date) =>
  (new Date(iso).getTime() - now.getTime()) / HOUR_MS

export function isInBookingWindow(slotStart: string, now: Date): boolean {
  const { earliest, latest } = bookingWindow(now)
  const t = new Date(slotStart).getTime()
  return t >= earliest.getTime() && t <= latest.getTime()
}

export function displayStatus(b: Booking, now: Date): DisplayStatus {
  const started = new Date(b.slotStart).getTime() <= now.getTime()
  const ended = new Date(slotEndIso(b.slotStart)).getTime() <= now.getTime()
  if (b.status === "confirmed" && ended) return "completed"
  if (b.status === "pending" && started) return "expired"
  return b.status
}

export const isUpcoming = (b: Booking, now: Date) =>
  isActive(b) && new Date(slotEndIso(b.slotStart)).getTime() > now.getTime()

/** Visitor can cancel or reschedule on their own. */
export function canChangeThemselves(b: Booking, now: Date): boolean {
  return isActive(b) && hoursUntil(b.slotStart, now) >= SCHEDULE.changeNoticeHours
}

/** Inside the 48h window: visitor may only tell the minister they can't come. */
export function canSendLateNotice(b: Booking, now: Date): boolean {
  return isActive(b) && !canChangeThemselves(b, now) && hoursUntil(b.slotStart, now) > 0
}

export function hasPendingReschedule(b: Booking, all: Booking[]): boolean {
  return all.some((x) => x.rescheduleOfId === b.id && x.status === "pending")
}

export const canApprove = (b: Booking, now: Date) =>
  b.status === "pending" && hoursUntil(b.slotStart, now) > 0

export const canDecline = canApprove

export const canMarkNoShow = (b: Booking, now: Date) =>
  b.status === "confirmed" && hoursUntil(b.slotStart, now) <= 0

export const canUndoNoShow = (b: Booking) => b.status === "no_show"

/** Can the decision on this booking be reverted back to pending? */
export const canRevertDecision = (b: Booking, now: Date) =>
  (b.status === "confirmed" || b.status === "declined") && hoursUntil(b.slotStart, now) > 0

/** One active booking per person per session day. */
export function userHasBookingOnDay(
  bookings: Booking[],
  userId: string,
  key: string,
  excludeId?: string
): Booking | undefined {
  return bookings.find(
    (b) =>
      b.userId === userId &&
      b.id !== excludeId &&
      isActive(b) &&
      dateKey(b.slotStart) === key
  )
}

export function slotIsFree(bookings: Booking[], slotStart: string): boolean {
  return !bookings.some((b) => b.slotStart === slotStart && occupiesSlot(b))
}

interface AvailabilityInput {
  bookings: Booking[]
  blocked: BlockedDate[]
  userId: string
  now: Date
  /** When rescheduling, the booking being moved does not count against the day. */
  excludeBookingId?: string
}

/** Every session day a visitor can see in the booking picker. */
export function buildAvailability(input: AvailabilityInput): ThursdayAvailability[] {
  const { bookings, blocked, userId, now, excludeBookingId } = input
  const { latest } = bookingWindow(now)
  const blockedKeys = new Set(blocked.map((b) => b.date))

  return sessionDaysBetween(now, latest).map((key) => {
    const mine = userHasBookingOnDay(bookings, userId, key, excludeBookingId)
    const slots = slotsForDay(key).map((start) => {
      const mineHere = bookings.find(
        (b) => b.slotStart === start && b.userId === userId && isActive(b) && b.id !== excludeBookingId
      )
      if (mineHere) return { start, state: "mine" as const }
      const free =
        slotIsFree(
          bookings.filter((b) => b.id !== excludeBookingId),
          start
        ) && isInBookingWindow(start, now)
      return { start, state: free ? ("open" as const) : ("taken" as const) }
    })
    const openCount = slots.filter((s) => s.state === "open").length
    const anyInWindow = slotsForDay(key).some((s) => isInBookingWindow(s, now))

    let state: ThursdayAvailability["state"]
    if (blockedKeys.has(key)) state = "cancelled"
    else if (mine) state = "booked_by_me"
    else if (!anyInWindow) state = "closed"
    else if (openCount === 0) state = "full"
    else state = "open"

    return {
      date: key,
      state,
      openCount: state === "open" ? openCount : 0,
      slots: state === "open" ? slots : slots.map((s) => (s.state === "mine" ? s : { ...s, state: "taken" as const })),
      myBookingId: mine?.id,
    }
  })
}

/** Sort helpers */
export const bySlotAsc = (a: Booking, b: Booking) => a.slotStart.localeCompare(b.slotStart)
export const bySlotDesc = (a: Booking, b: Booking) => b.slotStart.localeCompare(a.slotStart)
