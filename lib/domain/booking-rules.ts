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

/** Anything with a status and a session time (admin rows or a managed booking). */
type Timed = Pick<Booking, "status" | "slotStart">

const ACTIVE: BookingStatus[] = ["pending", "confirmed"]
/** Statuses that keep a slot unavailable to others. */
const OCCUPYING: BookingStatus[] = ["pending", "confirmed", "attended", "no_show"]

export const isActive = (b: Pick<Booking, "status">) => ACTIVE.includes(b.status)
export const occupiesSlot = (b: Pick<Booking, "status">) => OCCUPYING.includes(b.status)

const hoursUntil = (iso: string, now: Date) =>
  (new Date(iso).getTime() - now.getTime()) / HOUR_MS

export function isInBookingWindow(slotStart: string, now: Date): boolean {
  const { earliest, latest } = bookingWindow(now)
  const t = new Date(slotStart).getTime()
  return t >= earliest.getTime() && t <= latest.getTime()
}

/**
 * Visitor-facing status. A visitor never sees "unmarked": a confirmed
 * session that has ended reads as completed until the minister says otherwise.
 */
export function displayStatus(b: Timed, now: Date): DisplayStatus {
  const started = new Date(b.slotStart).getTime() <= now.getTime()
  const ended = new Date(slotEndIso(b.slotStart)).getTime() <= now.getTime()
  if (b.status === "attended") return "completed"
  if (b.status === "confirmed" && ended) return "completed"
  if (b.status === "pending" && started) return "expired"
  return b.status
}

/** Admin-facing status: shows which started sessions still need attendance. */
export function adminStatus(b: Timed, now: Date): DisplayStatus {
  if (needsAttendance(b, now)) return "unmarked"
  return displayStatus(b, now)
}

export const isUpcoming = (b: Timed, now: Date) =>
  isActive(b) && new Date(slotEndIso(b.slotStart)).getTime() > now.getTime()

/** Visitor can cancel on their own (from their manage link). */
export function canChangeThemselves(b: Timed, now: Date): boolean {
  return isActive(b) && hoursUntil(b.slotStart, now) >= SCHEDULE.changeNoticeHours
}

/** Inside the 48h window: visitor may only tell the minister they can't come. */
export function canSendLateNotice(b: Timed, now: Date): boolean {
  return isActive(b) && !canChangeThemselves(b, now) && hoursUntil(b.slotStart, now) > 0
}

export const canApprove = (b: Booking, now: Date) =>
  b.status === "pending" && hoursUntil(b.slotStart, now) > 0

export const canDecline = canApprove

const ATTENDANCE_STATUSES: BookingStatus[] = ["confirmed", "attended", "no_show"]

/** Attendance can be recorded (or corrected) from the moment a session starts. */
export const canMarkAttendance = (b: Timed, now: Date) =>
  ATTENDANCE_STATUSES.includes(b.status) && hoursUntil(b.slotStart, now) <= 0

/** Started, confirmed, and nobody has said whether they came. */
export const needsAttendance = (b: Timed, now: Date) =>
  b.status === "confirmed" && hoursUntil(b.slotStart, now) <= 0

/** Someone who missed their session can get a personal follow-up email. */
export const canSendFollowUp = (b: Booking) => b.status === "no_show"

/** Can the decision on this booking be reverted back to pending? */
export const canRevertDecision = (b: Booking, now: Date) =>
  (b.status === "confirmed" || b.status === "declined") && hoursUntil(b.slotStart, now) > 0

/** One active booking per person (by email) per session day. */
export function personHasBookingOnDay(
  bookings: Booking[],
  personId: string,
  key: string,
  excludeId?: string
): Booking | undefined {
  return bookings.find(
    (b) => b.personId === personId && b.id !== excludeId && isActive(b) && dateKey(b.slotStart) === key
  )
}

export function slotIsFree(bookings: Booking[], slotStart: string): boolean {
  return !bookings.some((b) => b.slotStart === slotStart && occupiesSlot(b))
}

interface AvailabilityInput {
  bookings: Booking[]
  blocked: BlockedDate[]
  now: Date
}

/**
 * Every session day shown in the public booking picker. It never reveals
 * who holds a slot, only whether it is open.
 */
export function buildAvailability({ bookings, blocked, now }: AvailabilityInput): ThursdayAvailability[] {
  const { latest } = bookingWindow(now)
  const blockedKeys = new Set(blocked.map((b) => b.date))

  return sessionDaysBetween(now, latest).map((key) => {
    const slots = slotsForDay(key).map((start) => ({
      start,
      state: slotIsFree(bookings, start) && isInBookingWindow(start, now) ? ("open" as const) : ("taken" as const),
    }))
    const openCount = slots.filter((s) => s.state === "open").length
    const anyInWindow = slotsForDay(key).some((s) => isInBookingWindow(s, now))

    let state: ThursdayAvailability["state"]
    if (blockedKeys.has(key)) state = "cancelled"
    else if (!anyInWindow) state = "closed"
    else if (openCount === 0) state = "full"
    else state = "open"

    return {
      date: key,
      state,
      openCount: state === "open" ? openCount : 0,
      slots: state === "open" ? slots : slots.map((s) => ({ ...s, state: "taken" as const })),
    }
  })
}

/** Sort helpers */
export const bySlotAsc = (a: Booking, b: Booking) => a.slotStart.localeCompare(b.slotStart)
export const bySlotDesc = (a: Booking, b: Booking) => b.slotStart.localeCompare(a.slotStart)
