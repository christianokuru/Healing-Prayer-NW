import { addMonths, format } from "date-fns"

import { SCHEDULE } from "@/lib/config/ministry"
import { isActive } from "@/lib/domain/booking-rules"
import { dateKey } from "@/lib/domain/time"
import type { AdminBooking, BlockedDate } from "@/lib/domain/types"

import { daySlots, type DaySlotRow } from "./selectors"

export interface CalendarCell {
  key: string
  day: number
  inMonth: boolean
  isToday: boolean
  isSessionDay: boolean
  blocked?: BlockedDate
  rows?: DaySlotRow[]
  booked: number
  pending: number
  past: boolean
}

/** Pure month grid (Sunday-first, full weeks) for the admin calendar. */
export function buildMonth(
  month: string,
  bookings: AdminBooking[],
  blocked: BlockedDate[],
  now: Date
): CalendarCell[] {
  const [y, m] = month.split("-").map(Number)
  const first = new Date(y, m - 1, 1, 12)
  const start = new Date(y, m - 1, 1 - first.getDay(), 12)
  const today = dateKey(now)
  const byDay = new Map<string, AdminBooking[]>()
  bookings.forEach((b) => {
    const k = dateKey(b.slotStart)
    byDay.set(k, [...(byDay.get(k) ?? []), b])
  })
  const blockedByDay = new Map(blocked.map((b) => [b.date, b]))
  const weeks = Math.ceil((first.getDay() + new Date(y, m, 0).getDate()) / 7)

  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12)
    const key = format(d, "yyyy-MM-dd")
    const isSessionDay = d.getDay() === SCHEDULE.weekday
    const blockedDay = blockedByDay.get(key)
    const rows = isSessionDay ? daySlots(key, byDay.get(key) ?? [], now, !!blockedDay) : undefined
    return {
      key,
      day: d.getDate(),
      inMonth: d.getMonth() === m - 1,
      isToday: key === today,
      isSessionDay,
      blocked: blockedDay,
      rows,
      booked: rows?.filter((r) => r.booking && (isActive(r.booking) || r.state === "completed" || r.state === "no_show")).length ?? 0,
      pending: rows?.filter((r) => r.state === "pending").length ?? 0,
      past: key < today,
    }
  })
}

export const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number)
  return format(addMonths(new Date(y, m - 1, 15), delta), "yyyy-MM")
}

export const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number)
  return format(new Date(y, m - 1, 15), "MMMM yyyy")
}
