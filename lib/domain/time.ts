import { TZDate, tz } from "@date-fns/tz"
import { addDays, addMonths, format, getDay } from "date-fns"

import { MINISTRY, SCHEDULE } from "@/lib/config/ministry"

/**
 * Every date shown to people is in Calgary time, whatever the
 * device's own time zone. Storage and the API stay in UTC.
 */
const TZ = MINISTRY.timeZone
const inCalgary = { in: tz(TZ) }

export const HOUR_MS = 60 * 60 * 1000

export function toCalgary(iso: string | Date): TZDate {
  return new TZDate(new Date(iso).getTime(), TZ)
}

/** yyyy-MM-dd key of the Calgary-local day. */
export function dateKey(iso: string | Date): string {
  return format(new Date(iso), "yyyy-MM-dd", inCalgary)
}

/** UTC ISO for a Calgary-local date key and "HH:mm" time. DST-safe. */
export function slotStartIso(key: string, time: string): string {
  const [y, m, d] = key.split("-").map(Number)
  const [h, min] = time.split(":").map(Number)
  return new Date(new TZDate(y, m - 1, d, h, min, 0, TZ).getTime()).toISOString()
}

export function slotEndIso(startIso: string): string {
  return new Date(
    new Date(startIso).getTime() + SCHEDULE.sessionMinutes * 60 * 1000
  ).toISOString()
}

/** Calgary-local "noon" of a date key; safe anchor for date math. */
export function keyToDate(key: string): TZDate {
  const [y, m, d] = key.split("-").map(Number)
  return new TZDate(y, m - 1, d, 12, 0, 0, TZ)
}

export function isSessionDay(key: string): boolean {
  return getDay(keyToDate(key)) === SCHEDULE.weekday
}

/** Session-day keys from `fromIso` (inclusive) to `toIso` (inclusive). */
export function sessionDaysBetween(fromIso: string | Date, toIso: string | Date): string[] {
  const end = dateKey(toIso)
  let cursor = keyToDate(dateKey(fromIso))
  while (getDay(cursor) !== SCHEDULE.weekday) cursor = addDays(cursor, 1)
  const keys: string[] = []
  while (format(cursor, "yyyy-MM-dd") <= end) {
    keys.push(format(cursor, "yyyy-MM-dd"))
    cursor = addDays(cursor, 7)
  }
  return keys
}

export function slotsForDay(key: string): string[] {
  return SCHEDULE.slotTimes.map((t) => slotStartIso(key, t))
}

export function bookingWindow(now: Date) {
  return {
    earliest: new Date(now.getTime() + SCHEDULE.minNoticeHours * HOUR_MS),
    latest: addMonths(now, SCHEDULE.maxAdvanceMonths),
  }
}

export function monthKey(iso: string | Date): string {
  return format(new Date(iso), "yyyy-MM", inCalgary)
}

/* ---------- Formatting (always Calgary time) ---------- */

export const fmt = {
  /** Thursday, November 19 */
  dateLong: (iso: string | Date) => format(new Date(iso), "EEEE, MMMM d", inCalgary),
  /** Thursday, November 19, 2026 */
  dateFull: (iso: string | Date) => format(new Date(iso), "EEEE, MMMM d, yyyy", inCalgary),
  /** Thu, Nov 19 */
  dateShort: (iso: string | Date) => format(new Date(iso), "EEE, MMM d", inCalgary),
  /** Nov 19 */
  dayMonth: (iso: string | Date) => format(new Date(iso), "MMM d", inCalgary),
  /** Nov 19, 2026 */
  dayMonthYear: (iso: string | Date) => format(new Date(iso), "MMM d, yyyy", inCalgary),
  /** 7:30 pm */
  time: (iso: string | Date) => format(new Date(iso), "h:mm aaa", inCalgary),
  monthShort: (iso: string | Date) => format(new Date(iso), "MMM", inCalgary),
  monthYear: (iso: string | Date) => format(new Date(iso), "MMMM yyyy", inCalgary),
  dayNumber: (iso: string | Date) => format(new Date(iso), "d", inCalgary),
  weekdayShort: (iso: string | Date) => format(new Date(iso), "EEE", inCalgary),
  /** 7:30 – 8:00 pm */
  timeRange: (startIso: string) => {
    const end = slotEndIso(startIso)
    const s = format(new Date(startIso), "h:mm", inCalgary)
    return `${s} – ${format(new Date(end), "h:mm aaa", inCalgary)}`
  },
}

export function keyLabel(key: string, style: keyof typeof fmt = "dateLong"): string {
  const fn = fmt[style] as (d: Date) => string
  return fn(keyToDate(key))
}

/** "in 3 days", "tomorrow", "today", "2 weeks ago" — human, not precise. */
export function relativeDays(iso: string, now: Date): string {
  const days = Math.round(
    (keyToDate(dateKey(iso)).getTime() - keyToDate(dateKey(now)).getTime()) /
      (24 * HOUR_MS)
  )
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days === -1) return "Yesterday"
  if (days > 1 && days < 14) return `In ${days} days`
  if (days >= 14) return `In ${Math.round(days / 7)} weeks`
  if (days < -1 && days > -14) return `${-days} days ago`
  return `${Math.round(-days / 7)} weeks ago`
}

export function greetingFor(now: Date): string {
  const h = toCalgary(now).getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}
