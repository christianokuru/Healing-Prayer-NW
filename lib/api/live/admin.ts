import type { AdminApi } from "@/lib/api/contracts"
import type {
  AdminBooking,
  AnalyticsSummary,
  BlockedDate,
  Note,
  PersonDetail,
  PersonSummary,
} from "@/lib/domain/types"

import { request, seg } from "./http"

const booking = (id: string, action: string) => `/admin/bookings/${seg(id)}/${action}`

/** The API accepts 3, 6 or 12 months; pick the nearest. */
function analyticsMonths(months = 6): 3 | 6 | 12 {
  if (months <= 3) return 3
  if (months <= 6) return 6
  return 12
}

export const liveAdminApi: AdminApi = {
  listBookings(range) {
    return request<AdminBooking[]>("GET", "/admin/bookings", { query: { from: range?.from, to: range?.to } })
  },

  approve({ bookingId, zoomLink }) {
    const link = zoomLink?.trim()
    return request<AdminBooking>("POST", booking(bookingId, "approve"), { body: link ? { zoomLink: link } : {} })
  },

  decline({ bookingId, message }) {
    const text = message?.trim()
    return request<AdminBooking>("POST", booking(bookingId, "decline"), { body: text ? { message: text } : {} })
  },

  revertDecision(bookingId) {
    return request<AdminBooking>("POST", booking(bookingId, "revert"))
  },

  setAttendance(bookingId, attendance) {
    return request<AdminBooking>("PUT", booking(bookingId, "attendance"), { body: { attendance } })
  },

  sendFollowUp({ bookingId, subject, message }) {
    return request<AdminBooking>("POST", booking(bookingId, "follow-up"), {
      body: { subject: subject.trim(), message: message.trim() },
    })
  },

  listBlockedDates() {
    return request<BlockedDate[]>("GET", "/admin/blocked-dates")
  },

  blockDate(date, reason) {
    const text = reason?.trim()
    return request<{ blocked: BlockedDate; affected: number }>("POST", "/admin/blocked-dates", {
      body: text ? { date, reason: text } : { date },
    })
  },

  async unblockDate(date) {
    await request<void>("DELETE", `/admin/blocked-dates/${seg(date)}`)
  },

  listPeople() {
    return request<PersonSummary[]>("GET", "/admin/people")
  },

  getPerson(personId) {
    return request<PersonDetail>("GET", `/admin/people/${seg(personId)}`)
  },

  getAnalytics(months) {
    return request<AnalyticsSummary>("GET", "/admin/analytics", { query: { months: analyticsMonths(months) } })
  },

  listNotes(options) {
    return request<Note[]>("GET", "/admin/notes", { query: { personId: options?.personId } })
  },

  createNote({ body, personId }) {
    return request<Note>("POST", "/admin/notes", { body: { body: body.trim(), personId: personId || null } })
  },

  updateNote(noteId, { body, personId }) {
    return request<Note>("PATCH", `/admin/notes/${seg(noteId)}`, {
      body: { body: body.trim(), personId: personId || null },
    })
  },

  async deleteNote(noteId) {
    await request<void>("DELETE", `/admin/notes/${seg(noteId)}`)
  },
}
