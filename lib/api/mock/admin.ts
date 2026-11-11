import { addMonths, format } from "date-fns"

import type { AdminApi } from "@/lib/api/contracts"
import { ApiError } from "@/lib/api/errors"
import { SCHEDULE } from "@/lib/config/ministry"
import {
  canApprove,
  canDecline,
  canMarkNoShow,
  canRevertDecision,
  canUndoNoShow,
  displayStatus,
  isActive,
} from "@/lib/domain/booking-rules"
import { dateKey, fmt, isSessionDay, monthKey, sessionDaysBetween } from "@/lib/domain/time"
import type {
  AdminBooking,
  Booking,
  PersonSummary,
  PrayerTopic,
} from "@/lib/domain/types"

import { requireAdmin } from "./guards"
import { latency, mockStore, type MockDbState } from "./store"

const nowIso = () => new Date().toISOString()

const attended = (b: Booking, now: Date) => displayStatus(b, now) === "completed"

function summarize(db: MockDbState, userId: string, now: Date): PersonSummary {
  const u = db.users.find((x) => x.id === userId)!
  const mine = db.bookings.filter((b) => b.userId === userId)
  const done = mine.filter((b) => attended(b, now)).sort((a, b) => a.slotStart.localeCompare(b.slotStart))
  const topicCount = new Map<PrayerTopic, number>()
  done.forEach((b) => topicCount.set(b.topic, (topicCount.get(b.topic) ?? 0) + 1))
  const topTopic = [...topicCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    firstVisit: done[0]?.slotStart,
    lastVisit: done[done.length - 1]?.slotStart,
    completedCount: done.length,
    noShowCount: mine.filter((b) => b.status === "no_show").length,
    topTopic,
  }
}

function toAdmin(db: MockDbState, b: Booking, now: Date): AdminBooking {
  const u = db.users.find((x) => x.id === b.userId)!
  return {
    ...b,
    visitor: { id: u.id, fullName: u.fullName, email: u.email, phone: u.phone },
    visitCount: db.bookings.filter((x) => x.userId === u.id && attended(x, now)).length,
  }
}

function mutateBooking(
  id: string,
  guard: (b: Booking, now: Date) => boolean,
  failMessage: string,
  apply: (b: Booking, db: MockDbState) => void
): AdminBooking {
  const now = new Date()
  return mockStore.write((db) => {
    const b = db.bookings.find((x) => x.id === id)
    if (!b) throw new ApiError("not_found", "That booking no longer exists.")
    if (!guard(b, now)) throw new ApiError("invalid_state", failMessage)
    apply(b, db)
    b.updatedAt = nowIso()
    return toAdmin(db, b, now)
  })
}

/** When a reschedule request is approved, the original session is released. */
function settleReschedule(b: Booking, db: MockDbState) {
  if (!b.rescheduleOfId) return
  const original = db.bookings.find((x) => x.id === b.rescheduleOfId)
  if (original && isActive(original)) {
    original.status = "rescheduled"
    original.updatedAt = nowIso()
  }
}

export const mockAdminApi: AdminApi = {
  async listBookings(range) {
    await latency()
    requireAdmin()
    const now = new Date()
    return mockStore.read((db) =>
      db.bookings
        .filter((b) => (!range?.from || b.slotStart >= range.from) && (!range?.to || b.slotStart <= range.to))
        .map((b) => toAdmin(db, b, now))
        .sort((a, b) => a.slotStart.localeCompare(b.slotStart))
    )
  },

  async approve({ bookingId, zoomLink }) {
    await latency()
    requireAdmin()
    return mutateBooking(bookingId, canApprove, "This request can no longer be approved.", (b, db) => {
      if (b.mode === "online") {
        const link = zoomLink?.trim()
        if (!link) throw new ApiError("validation", "Please add the Zoom link for this online session.")
        b.zoomLink = link
      }
      b.status = "confirmed"
      settleReschedule(b, db)
    })
  },

  async decline({ bookingId, message }) {
    await latency()
    requireAdmin()
    return mutateBooking(bookingId, canDecline, "This request can no longer be declined.", (b) => {
      b.status = "declined"
      b.declineMessage = message?.trim() || undefined
    })
  },

  async revertDecision(bookingId) {
    await latency(120, 240)
    requireAdmin()
    return mutateBooking(bookingId, canRevertDecision, "This can't be undone any more.", (b, db) => {
      if (b.rescheduleOfId) {
        const original = db.bookings.find((x) => x.id === b.rescheduleOfId)
        if (original?.status === "rescheduled") original.status = "confirmed"
      }
      b.status = "pending"
      b.declineMessage = undefined
    })
  },

  async markNoShow(bookingId) {
    await latency()
    requireAdmin()
    return mutateBooking(bookingId, canMarkNoShow, "Only past, confirmed sessions can be marked as a no-show.", (b) => {
      b.status = "no_show"
    })
  },

  async undoNoShow(bookingId) {
    await latency(120, 240)
    requireAdmin()
    return mutateBooking(bookingId, (b) => canUndoNoShow(b), "This session isn't marked as a no-show.", (b) => {
      b.status = "confirmed"
    })
  },

  async listBlockedDates() {
    await latency(100, 200)
    requireAdmin()
    return mockStore.read((db) => [...db.blocked].sort((a, b) => a.date.localeCompare(b.date)))
  },

  async blockDate(date, reason) {
    await latency()
    requireAdmin()
    if (!isSessionDay(date)) throw new ApiError("validation", `Only ${SCHEDULE.weekdayName}s can be cancelled.`)
    return mockStore.write((db) => {
      if (db.blocked.some((b) => b.date === date)) {
        throw new ApiError("invalid_state", "That Thursday is already cancelled.")
      }
      const now = new Date()
      let affected = 0
      db.bookings
        .filter((b) => dateKey(b.slotStart) === date && isActive(b) && new Date(b.slotStart) > now)
        .forEach((b) => {
          b.status = "cancelled_by_minister"
          b.updatedAt = nowIso()
          affected++
        })
      const blocked = { date, reason: reason?.trim() || undefined, createdAt: nowIso() }
      db.blocked.push(blocked)
      return { blocked, affected }
    })
  },

  async unblockDate(date) {
    await latency()
    requireAdmin()
    mockStore.write((db) => {
      db.blocked = db.blocked.filter((b) => b.date !== date)
    })
  },

  async listPeople() {
    await latency()
    requireAdmin()
    const now = new Date()
    return mockStore.read((db) =>
      db.users
        .filter((u) => u.role === "visitor")
        .map((u) => summarize(db, u.id, now))
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
    )
  },

  async getPerson(personId) {
    await latency()
    requireAdmin()
    const now = new Date()
    return mockStore.read((db) => {
      if (!db.users.some((u) => u.id === personId && u.role === "visitor")) {
        throw new ApiError("not_found", "We couldn't find that person.")
      }
      return {
        ...summarize(db, personId, now),
        bookings: db.bookings
          .filter((b) => b.userId === personId)
          .sort((a, b) => b.slotStart.localeCompare(a.slotStart)),
      }
    })
  },

  async getAnalytics(months = 6) {
    await latency()
    requireAdmin()
    const now = new Date()
    return mockStore.read((db) => {
      const from = addMonths(now, -(months - 1))
      const firstMonth = monthKey(from)
      const inRange = db.bookings.filter((b) => monthKey(b.slotStart) >= firstMonth && new Date(b.slotStart) <= now)
      const done = inRange.filter((b) => attended(b, now))
      const noShows = inRange.filter((b) => b.status === "no_show").length
      const blockedKeys = new Set(db.blocked.map((b) => b.date))

      const monthly = Array.from({ length: months }, (_, i) => {
        const d = addMonths(from, i)
        const key = monthKey(d)
        const [y, m] = key.split("-").map(Number)
        const days = sessionDaysBetween(new Date(y, m - 1, 1, 12), new Date(y, m, 0, 12)).filter(
          (k) => !blockedKeys.has(k)
        )
        return {
          month: key,
          label: fmt.monthShort(new Date(y, m - 1, 15)),
          held: done.filter((b) => monthKey(b.slotStart) === key).length,
          capacity: days.length * SCHEDULE.slotTimes.length,
        }
      })

      const topicCounts = new Map<PrayerTopic, number>()
      done.forEach((b) => topicCounts.set(b.topic, (topicCounts.get(b.topic) ?? 0) + 1))

      const people = new Map<string, number>()
      done.forEach((b) => people.set(b.userId, (people.get(b.userId) ?? 0) + 1))

      const frequent = [...people.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([id]) => summarize(db, id, now))

      return {
        rangeLabel: `${format(from, "MMMM")} – ${format(now, "MMMM yyyy")}`,
        sessionsHeld: done.length,
        thursdaysHeld: new Set(done.map((b) => dateKey(b.slotStart))).size,
        peoplePrayedFor: people.size,
        returningPeople: [...people.values()].filter((c) => c > 1).length,
        attendanceRate: done.length + noShows ? Math.round((done.length / (done.length + noShows)) * 100) : 100,
        noShows,
        onlineSessions: done.filter((b) => b.mode === "online").length,
        monthly,
        topics: [...topicCounts.entries()]
          .map(([topic, count]) => ({ topic, count }))
          .sort((a, b) => b.count - a.count),
        frequent,
      }
    })
  },
}
