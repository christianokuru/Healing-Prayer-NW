/**
 * Domain types shared by the UI and the API layer.
 * These mirror the contract with the FastAPI backend:
 * all timestamps are ISO-8601 strings in UTC.
 *
 * Visitors have no accounts: they book with their contact details and
 * manage a booking through a private link in their emails. Only the
 * prayer minister (admin) signs in.
 */

export type Role = "admin"

/** The signed-in prayer minister. */
export interface User {
  id: string
  email: string
  fullName: string
  role: Role
  createdAt: string
}

export type AttendanceMode = "in_person" | "online"

/** Status as stored by the backend. */
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "cancelled_by_minister"
  /** The minister marked that they came. */
  | "attended"
  /** The minister marked that they didn't come. */
  | "no_show"

/** What the minister records after a session has started. `null` clears it. */
export type Attendance = "attended" | "no_show"

/** Status as shown to people (adds time-derived states). */
export type DisplayStatus =
  | BookingStatus
  | "completed"
  /** Confirmed and started, but attendance not recorded yet (admin only). */
  | "unmarked"
  | "expired"

/** Someone who has booked. Identified by their email address. */
export interface PersonContact {
  id: string
  fullName: string
  email: string
  phone: string
}

export interface Booking {
  id: string
  personId: string
  /** Session start, UTC ISO. */
  slotStart: string
  status: BookingStatus
  mode: AttendanceMode
  prayerPoints: string
  onlineReason?: string
  zoomLink?: string
  declineMessage?: string
  lateCancellation?: boolean
  /** When the minister last emailed them after a missed session. */
  followUpSentAt?: string
  createdAt: string
  updatedAt: string
}

/** Booking joined with the person, for admin views. */
export interface AdminBooking extends Booking {
  visitor: PersonContact
  visitCount: number
}

/** What a visitor sees through their private "manage my booking" link. */
export interface ManagedBooking {
  id: string
  slotStart: string
  status: BookingStatus
  mode: AttendanceMode
  fullName: string
  email: string
  prayerPoints: string
  zoomLink?: string
  declineMessage?: string
  lateCancellation?: boolean
}

export type SlotState = "open" | "taken"

export interface SlotAvailability {
  start: string
  state: SlotState
}

export type ThursdayState = "open" | "full" | "closed" | "cancelled"

export interface ThursdayAvailability {
  /** Calgary-local date key, yyyy-MM-dd. */
  date: string
  state: ThursdayState
  openCount: number
  slots: SlotAvailability[]
}

export interface BlockedDate {
  date: string
  reason?: string
  createdAt: string
}

export interface PersonSummary extends PersonContact {
  firstVisit?: string
  lastVisit?: string
  /** Sessions marked as attended. */
  completedCount: number
  noShowCount: number
}

export interface Note {
  id: string
  body: string
  /** Optional link to a person; their name is included for display. */
  personId?: string
  personName?: string
  createdAt: string
  updatedAt: string
}

export interface PersonDetail extends PersonSummary {
  bookings: Booking[]
  notes: Note[]
}

export interface AnalyticsSummary {
  rangeLabel: string
  sessionsHeld: number
  thursdaysHeld: number
  peoplePrayedFor: number
  returningPeople: number
  /** attended / (attended + no-shows), in %. Unmarked sessions are left out. */
  attendanceRate: number
  noShows: number
  /** Past confirmed sessions with no attendance recorded yet. */
  unmarked: number
  onlineSessions: number
  monthly: { month: string; label: string; held: number; capacity: number }[]
  frequent: PersonSummary[]
}

export type ApiErrorCode =
  | "invalid_credentials"
  | "invalid_token"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "slot_taken"
  | "one_per_thursday"
  | "outside_window"
  | "date_unavailable"
  | "too_late"
  | "invalid_state"
  | "validation"
  | "rate_limited"
  | "internal"

/** The single error shape every API call rejects with. */
export interface ApiErrorShape {
  code: ApiErrorCode
  message: string
}
