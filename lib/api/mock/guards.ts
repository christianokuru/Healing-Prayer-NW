import { ApiError } from "@/lib/api/errors"
import type { ManagedBooking, User } from "@/lib/domain/types"

import { mockStore, type MockAdminRecord, type MockBookingRecord, type MockDbState } from "./store"

export const toPublicUser = ({ password: _password, ...u }: MockAdminRecord): User => u

export function currentAdminRecord(): MockAdminRecord | null {
  const id = mockStore.sessionUserId
  if (!id) return null
  return mockStore.read((db) => db.admins.find((u) => u.id === id) ?? null)
}

export function requireAdmin(): MockAdminRecord {
  const user = currentAdminRecord()
  if (!user) throw new ApiError("unauthenticated", "Please log in again to continue.")
  return user
}

export const normEmail = (email: string) => email.trim().toLowerCase()

/** The visitor's view of their own booking, through their private link. */
export function toManaged(db: MockDbState, b: MockBookingRecord): ManagedBooking {
  const person = db.people.find((p) => p.id === b.personId)!
  return {
    id: b.id,
    slotStart: b.slotStart,
    status: b.status,
    mode: b.mode,
    fullName: person.fullName,
    email: person.email,
    prayerPoints: b.prayerPoints,
    zoomLink: b.status === "confirmed" ? b.zoomLink : undefined,
    declineMessage: b.declineMessage,
    lateCancellation: b.lateCancellation,
  }
}
