import { addMonths, format } from "date-fns"

import type { AdminApi } from "@/lib/api/contracts"
import { ApiError } from "@/lib/api/errors"
import { LIMITS, SCHEDULE } from "@/lib/config/ministry"
import {
  canApprove,
  canDecline,
  canMarkAttendance,
  canRevertDecision,
  canSendFollowUp,
  isActive,
  needsAttendance,
  personHasBookingOnDay,
  slotIsFree,
} from "@/lib/domain/booking-rules"
import { dateKey, fmt, isSessionDay, monthKey, sessionDaysBetween } from "@/lib/domain/time"
import type { AdminBooking, Booking, Note, PersonSummary } from "@/lib/domain/types"

import { requireAdmin } from "./guards"
import { latency, mockStore, newId, type MockBookingRecord, type MockDbState } from "./store"

const nowIso = () => new Date().toISOString()

const attended = (b: Booking) => b.status === "attended"

/** Strip mock-only fields (the manage token never reaches the admin UI). */
const asBooking = ({ manageToken: _token, ...b }: MockBookingRecord): Booking => b

function summarize(db: MockDbState, personId: string): PersonSummary {
  const p = db.people.find((x) => x.id === personId)!
  const mine = db.bookings.filter((b) => b.personId === personId)
  const done = mine.filter(attended).sort((a, b) => a.slotStart.localeCompare(b.slotStart))
  return {
    id: p.id,
    fullName: p.fullName,
    email: p.email,
    phone: p.phone,
    firstVisit: done[0]?.slotStart,
    lastVisit: done[done.length - 1]?.slotStart,
    completedCount: done.length,
    noShowCount: mine.filter((b) => b.status === "no_show").length,
  }
}

function toAdmin(db: MockDbState, b: MockBookingRecord): AdminBooking {
  const p = db.people.find((x) => x.id === b.personId)!
  return {
    ...asBooking(b),
    visitor: { id: p.id, fullName: p.fullName, email: p.email, phone: p.phone },
    visitCount: db.bookings.filter((x) => x.personId === p.id && attended(x)).length,
  }
}

function withPersonName(db: MockDbState, n: Note): Note {
  const person = n.personId ? db.people.find((p) => p.id === n.personId) : undefined
  return { ...n, personName: person?.fullName }
}

function mutateBooking(
  id: string,
  guard: (b: Booking, now: Date) => boolean,
  failMessage: string,
  apply: (b: MockBookingRecord, db: MockDbState) => void
): AdminBooking {
  const now = new Date()
  return mockStore.write((db) => {
    const b = db.bookings.find((x) => x.id === id)
    if (!b) throw new ApiError("not_found", "That booking no longer exists.")
    if (!guard(b, now)) throw new ApiError("invalid_state", failMessage)
    apply(b, db)
    b.updatedAt = nowIso()
    return toAdmin(db, b)
  })
}

function cleanNote(body: string): string {
  const text = body.trim()
  if (!text) throw new ApiError("validation", "Please write something in the note.")
  if (text.length > LIMITS.noteMax) {
    throw new ApiError("validation", `Please keep notes under ${LIMITS.noteMax} characters.`)
  }
  return text
}

function assertPerson(db: MockDbState, personId?: string | null) {
  if (personId && !db.people.some((p) => p.id === personId)) {
    throw new ApiError("not_found", "We couldn't find that person.")
  }
}

export const mockAdminApi: AdminApi = {
  async listBookings(range) {
    await latency()
    requireAdmin()
    return mockStore.read((db) =>
      db.bookings
        .filter((b) => (!range?.from || b.slotStart >= range.from) && (!range?.to || b.slotStart <= range.to))
        .map((b) => toAdmin(db, b))
        .sort((a, b) => a.slotStart.localeCompare(b.slotStart))
    )
  },

  async approve({ bookingId, zoomLink }) {
    await latency()
    requireAdmin()
    return mutateBooking(bookingId, canApprove, "This request can no longer be approved.", (b) => {
      if (b.mode === "online") {
        const link = zoomLink?.trim()
        if (!link) throw new ApiError("validation", "Please add the Zoom link for this online session.")
        b.zoomLink = link
      }
      b.status = "confirmed"
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
      if (b.status === "declined") {
        // The slot was released when declined, so it must still be free.
        const others = db.bookings.filter((x) => x.id !== b.id)
        if (!slotIsFree(others, b.slotStart) || personHasBookingOnDay(others, b.personId, dateKey(b.slotStart))) {
          throw new ApiError("invalid_state", "That time is no longer available, so this can't be undone.")
        }
      }
      b.status = "pending"
      b.zoomLink = undefined
      b.declineMessage = undefined
    })
  },

  async setAttendance(bookingId, attendance) {
    await latency(150, 300)
    requireAdmin()
    return mutateBooking(
      bookingId,
      canMarkAttendance,
      "Attendance can only be recorded for approved sessions that have started.",
      (b) => {
        b.status = attendance ?? "confirmed"
      }
    )
  },

  async sendFollowUp({ bookingId, subject, message }) {
    await latency(300, 600)
    requireAdmin()
    if (!subject.trim() || !message.trim()) {
      throw new ApiError("validation", "Please write a subject and a message.")
    }
    if (message.trim().length > LIMITS.followUpMax) {
      throw new ApiError("validation", `Please keep the message under ${LIMITS.followUpMax} characters.`)
    }
    return mutateBooking(
      bookingId,
      (b) => canSendFollowUp(b),
      "You can only email people who were marked as didn't come.",
      (b) => {
        // The live API queues the email; the demo just records that it went.
        b.followUpSentAt = nowIso()
      }
    )
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
    return mockStore.read((db) =>
      db.people.map((p) => summarize(db, p.id)).sort((a, b) => a.fullName.localeCompare(b.fullName))
    )
  },

  async getPerson(personId) {
    await latency()
    requireAdmin()
    return mockStore.read((db) => {
      if (!db.people.some((p) => p.id === personId)) {
        throw new ApiError("not_found", "We couldn't find that person.")
      }
      return {
        ...summarize(db, personId),
        bookings: db.bookings
          .filter((b) => b.personId === personId)
          .map(asBooking)
          .sort((a, b) => b.slotStart.localeCompare(a.slotStart)),
        notes: db.notes
          .filter((n) => n.personId === personId)
          .map((n) => withPersonName(db, n))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
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
      const done = inRange.filter(attended)
      const noShows = inRange.filter((b) => b.status === "no_show").length
      const unmarked = inRange.filter((b) => needsAttendance(b, now)).length
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

      const people = new Map<string, number>()
      done.forEach((b) => people.set(b.personId, (people.get(b.personId) ?? 0) + 1))

      const frequent = [...people.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([id]) => summarize(db, id))

      return {
        rangeLabel: `${format(from, "MMMM")} – ${format(now, "MMMM yyyy")}`,
        sessionsHeld: done.length,
        thursdaysHeld: new Set(done.map((b) => dateKey(b.slotStart))).size,
        peoplePrayedFor: people.size,
        returningPeople: [...people.values()].filter((c) => c > 1).length,
        attendanceRate: done.length + noShows ? Math.round((done.length / (done.length + noShows)) * 100) : 100,
        noShows,
        unmarked,
        onlineSessions: done.filter((b) => b.mode === "online").length,
        monthly,
        frequent,
      }
    })
  },

  async listNotes(options) {
    await latency(120, 260)
    requireAdmin()
    return mockStore.read((db) =>
      db.notes
        .filter((n) => !options?.personId || n.personId === options.personId)
        .map((n) => withPersonName(db, n))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    )
  },

  async createNote({ body, personId }) {
    await latency()
    requireAdmin()
    return mockStore.write((db) => {
      assertPerson(db, personId)
      const note: Note = {
        id: newId("n"),
        body: cleanNote(body),
        personId: personId || undefined,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      db.notes.push(note)
      return withPersonName(db, note)
    })
  },

  async updateNote(noteId, { body, personId }) {
    await latency()
    requireAdmin()
    return mockStore.write((db) => {
      const note = db.notes.find((n) => n.id === noteId)
      if (!note) throw new ApiError("not_found", "That note no longer exists.")
      assertPerson(db, personId)
      note.body = cleanNote(body)
      note.personId = personId || undefined
      note.updatedAt = nowIso()
      return withPersonName(db, note)
    })
  },

  async deleteNote(noteId) {
    await latency()
    requireAdmin()
    mockStore.write((db) => {
      if (!db.notes.some((n) => n.id === noteId)) throw new ApiError("not_found", "That note no longer exists.")
      db.notes = db.notes.filter((n) => n.id !== noteId)
    })
  },
}
