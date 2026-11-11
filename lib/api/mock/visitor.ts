import type { VisitorApi } from "@/lib/api/contracts"
import { ApiError } from "@/lib/api/errors"
import { LIMITS } from "@/lib/config/ministry"
import {
  buildAvailability,
  bySlotAsc,
  canChangeThemselves,
  canSendLateNotice,
  hasPendingReschedule,
  isInBookingWindow,
  slotIsFree,
  userHasBookingOnDay,
} from "@/lib/domain/booking-rules"
import { dateKey, isSessionDay, slotsForDay } from "@/lib/domain/time"
import type { Booking } from "@/lib/domain/types"

import { requireUser } from "./guards"
import { latency, mockStore, newId, type MockDbState } from "./store"

const nowIso = () => new Date().toISOString()

/** Shared slot validation for new requests and reschedules. */
function assertSlotBookable(db: MockDbState, userId: string, slotStart: string, excludeId?: string) {
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
  const others = db.bookings.filter((b) => b.id !== excludeId)
  if (!slotIsFree(others, slotStart)) {
    throw new ApiError("slot_taken", "Someone just took that time. Please choose another one.")
  }
  if (userHasBookingOnDay(db.bookings, userId, key, excludeId)) {
    throw new ApiError("one_per_thursday", "You already have a session that Thursday. You can book one session per Thursday.")
  }
}

function findOwn(db: MockDbState, userId: string, id: string): Booking {
  const b = db.bookings.find((x) => x.id === id && x.userId === userId)
  if (!b) throw new ApiError("not_found", "We couldn't find that booking.")
  return b
}

export const mockVisitorApi: VisitorApi = {
  async getAvailability(options) {
    await latency()
    const me = requireUser()
    return mockStore.read((db) =>
      buildAvailability({
        bookings: db.bookings,
        blocked: db.blocked,
        userId: me.id,
        now: new Date(),
        excludeBookingId: options?.excludeBookingId,
      })
    )
  },

  async listMyBookings() {
    await latency()
    const me = requireUser()
    return mockStore.read((db) => db.bookings.filter((b) => b.userId === me.id).sort(bySlotAsc))
  },

  async createBooking(input) {
    await latency(400, 700)
    const me = requireUser()
    const points = input.prayerPoints.trim()
    if (!points) throw new ApiError("validation", "Please share your prayer points.")
    if (points.length > LIMITS.prayerPointsMax) {
      throw new ApiError("validation", `Please keep your prayer points under ${LIMITS.prayerPointsMax} characters.`)
    }
    if (input.mode === "online" && !input.onlineReason?.trim()) {
      throw new ApiError("validation", "Please tell us briefly why you need to join online.")
    }
    return mockStore.write((db) => {
      assertSlotBookable(db, me.id, input.slotStart)
      const booking: Booking = {
        id: newId("b"),
        userId: me.id,
        slotStart: input.slotStart,
        status: "pending",
        mode: input.mode,
        topic: input.topic,
        prayerPoints: points,
        onlineReason: input.mode === "online" ? input.onlineReason?.trim() : undefined,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      db.bookings.push(booking)
      return booking
    })
  },

  async requestReschedule({ bookingId, slotStart }) {
    await latency(400, 700)
    const me = requireUser()
    return mockStore.write((db) => {
      const original = findOwn(db, me.id, bookingId)
      if (!canChangeThemselves(original, new Date())) {
        throw new ApiError("too_late", "This session is less than 48 hours away, so it can't be moved online.")
      }
      if (original.rescheduleOfId) {
        throw new ApiError("invalid_state", "This is already a request to move a session. Withdraw it and ask again instead.")
      }
      if (original.slotStart === slotStart) {
        throw new ApiError("validation", "That's your current time. Please choose a different one.")
      }
      if (hasPendingReschedule(original, db.bookings)) {
        throw new ApiError("invalid_state", "You already asked to move this session. Please wait for a reply.")
      }
      assertSlotBookable(db, me.id, slotStart, original.id)
      const request: Booking = {
        ...original,
        id: newId("b"),
        slotStart,
        status: "pending",
        zoomLink: undefined,
        rescheduleOfId: original.id,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      // A pending original is simply moved: there is nothing to keep.
      if (original.status === "pending") {
        original.status = "rescheduled"
        original.updatedAt = nowIso()
        request.rescheduleOfId = undefined
      }
      db.bookings.push(request)
      return request
    })
  },

  async cancelBooking(bookingId) {
    await latency()
    const me = requireUser()
    return mockStore.write((db) => {
      const b = findOwn(db, me.id, bookingId)
      if (!canChangeThemselves(b, new Date())) {
        throw new ApiError("too_late", "This session is less than 48 hours away. Please let the prayer minister know instead.")
      }
      b.status = "cancelled"
      b.updatedAt = nowIso()
      // Withdraw any reschedule request hanging off this booking.
      db.bookings
        .filter((x) => x.rescheduleOfId === b.id && x.status === "pending")
        .forEach((x) => {
          x.status = "cancelled"
          x.updatedAt = nowIso()
        })
      return b
    })
  },

  async sendLateNotice(bookingId) {
    await latency()
    const me = requireUser()
    return mockStore.write((db) => {
      const b = findOwn(db, me.id, bookingId)
      if (!canSendLateNotice(b, new Date())) {
        throw new ApiError("invalid_state", "This booking can't be changed any more.")
      }
      b.status = "cancelled"
      b.lateCancellation = true
      b.updatedAt = nowIso()
      return b
    })
  },
}
