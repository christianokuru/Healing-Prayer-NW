import type { PublicApi } from "@/lib/api/contracts"
import { ApiError } from "@/lib/api/errors"
import { LIMITS } from "@/lib/config/ministry"
import {
  buildAvailability,
  canChangeThemselves,
  canSendLateNotice,
  isInBookingWindow,
  personHasBookingOnDay,
  slotIsFree,
} from "@/lib/domain/booking-rules"
import { dateKey, isSessionDay, slotsForDay } from "@/lib/domain/time"

import { normEmail, toManaged } from "./guards"
import { latency, mockStore, newId, newManageToken, type MockBookingRecord, type MockDbState } from "./store"

const nowIso = () => new Date().toISOString()

function assertSlotBookable(db: MockDbState, personId: string | undefined, slotStart: string) {
  const key = dateKey(slotStart)
  if (!isSessionDay(key) || !slotsForDay(key).includes(slotStart)) {
    throw new ApiError("validation", "That isn't one of our session times.")
  }
  if (db.blocked.some((b) => b.date === key)) {
    throw new ApiError("date_unavailable", "Sorry, sessions aren't running that Thursday. Please choose another date.")
  }
  if (!isInBookingWindow(slotStart, new Date())) {
    throw new ApiError("outside_window", "Sessions can be booked from 48 hours up to one month ahead.")
  }
  if (!slotIsFree(db.bookings, slotStart)) {
    throw new ApiError("slot_taken", "Someone just took that time. Please choose another one.")
  }
  if (personId && personHasBookingOnDay(db.bookings, personId, key)) {
    throw new ApiError(
      "one_per_thursday",
      "You already have a session booked that Thursday. You can book one session per Thursday."
    )
  }
}

function byToken(db: MockDbState, token: string): MockBookingRecord {
  const b = db.bookings.find((x) => x.manageToken === token.trim())
  if (!b) {
    throw new ApiError("not_found", "We couldn't find that booking. The link may be incomplete. Please check your email.")
  }
  return b
}

export const mockPublicApi: PublicApi = {
  async getAvailability() {
    await latency()
    return mockStore.read((db) => buildAvailability({ bookings: db.bookings, blocked: db.blocked, now: new Date() }))
  },

  async createBooking(input) {
    await latency(400, 700)
    // Bots fill every field; quietly refuse without saying why.
    if (input.website?.trim()) throw new ApiError("validation", "Please check the form and try again.")
    const fullName = input.fullName.trim()
    const email = normEmail(input.email)
    const phone = input.phone.trim()
    const points = input.prayerPoints.trim()
    if (!fullName || !email || !phone) throw new ApiError("validation", "Please fill in your name, email and phone.")
    if (!points) throw new ApiError("validation", "Please share what you'd like prayer for.")
    if (points.length > LIMITS.prayerPointsMax) {
      throw new ApiError("validation", `Please keep your prayer points under ${LIMITS.prayerPointsMax} characters.`)
    }
    if (input.online && !input.onlineReason?.trim()) {
      throw new ApiError("validation", "Please tell us briefly why you can't come in person.")
    }

    return mockStore.write((db) => {
      const existing = db.people.find((p) => p.email === email)
      assertSlotBookable(db, existing?.id, input.slotStart)
      // People are recognised by email; their latest name and phone are kept.
      const person = existing ?? { id: newId("p"), email, fullName, phone, createdAt: nowIso() }
      person.fullName = fullName
      person.phone = phone
      if (!existing) db.people.push(person)

      const booking: MockBookingRecord = {
        id: newId("b"),
        personId: person.id,
        slotStart: input.slotStart,
        status: "pending",
        mode: input.online ? "online" : "in_person",
        prayerPoints: points,
        onlineReason: input.online ? input.onlineReason?.trim() : undefined,
        manageToken: newManageToken(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      db.bookings.push(booking)
      return { booking: toManaged(db, booking), manageToken: booking.manageToken }
    })
  },

  async getManagedBooking(token) {
    await latency()
    return mockStore.read((db) => toManaged(db, byToken(db, token)))
  },

  async cancelManagedBooking(token) {
    await latency()
    return mockStore.write((db) => {
      const b = byToken(db, token)
      if (!canChangeThemselves(b, new Date())) {
        throw new ApiError("too_late", "This session is less than 48 hours away. Please let the prayer minister know instead.")
      }
      b.status = "cancelled"
      b.updatedAt = nowIso()
      return toManaged(db, b)
    })
  },

  async sendLateNotice(token) {
    await latency()
    return mockStore.write((db) => {
      const b = byToken(db, token)
      if (!canSendLateNotice(b, new Date())) {
        throw new ApiError("invalid_state", "This booking can't be changed any more.")
      }
      b.status = "cancelled"
      b.lateCancellation = true
      b.updatedAt = nowIso()
      return toManaged(db, b)
    })
  },
}
