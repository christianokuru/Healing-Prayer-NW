/**
 * Domain types shared by the UI and the API layer.
 * These mirror the contract agreed with the FastAPI backend:
 * all timestamps are ISO-8601 strings in UTC.
 */

export type Role = "visitor" | "admin"

export interface User {
  id: string
  email: string
  fullName: string
  phone: string
  role: Role
  emailVerified: boolean
  createdAt: string
}

export type AttendanceMode = "in_person" | "online"

export type PrayerTopic =
  | "healing"
  | "emotional"
  | "family"
  | "deliverance"
  | "forgiveness"
  | "other"

/** Status as stored by the backend. */
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "cancelled_by_minister"
  | "rescheduled"
  | "no_show"

/** Status as shown to people (adds time-derived states). */
export type DisplayStatus =
  | BookingStatus
  | "completed"
  | "expired"

export interface Booking {
  id: string
  userId: string
  /** Session start, UTC ISO. */
  slotStart: string
  status: BookingStatus
  mode: AttendanceMode
  topic: PrayerTopic
  prayerPoints: string
  onlineReason?: string
  zoomLink?: string
  declineMessage?: string
  /** Set when this request moves an existing booking to a new time. */
  rescheduleOfId?: string
  lateCancellation?: boolean
  createdAt: string
  updatedAt: string
}

/** Booking joined with the visitor, for admin views. */
export interface AdminBooking extends Booking {
  visitor: Pick<User, "id" | "fullName" | "email" | "phone">
  visitCount: number
}

export type SlotState = "open" | "taken" | "mine"

export interface SlotAvailability {
  start: string
  state: SlotState
}

export type ThursdayState =
  | "open"
  | "full"
  | "closed"
  | "cancelled"
  | "booked_by_me"

export interface ThursdayAvailability {
  /** Calgary-local date key, yyyy-MM-dd. */
  date: string
  state: ThursdayState
  openCount: number
  slots: SlotAvailability[]
  /** The visitor's active booking that day, if any. */
  myBookingId?: string
}

export interface BlockedDate {
  date: string
  reason?: string
  createdAt: string
}

export interface PersonSummary {
  id: string
  fullName: string
  email: string
  phone: string
  firstVisit?: string
  lastVisit?: string
  completedCount: number
  noShowCount: number
  topTopic?: PrayerTopic
}

export interface PersonDetail extends PersonSummary {
  bookings: Booking[]
}

export interface AnalyticsSummary {
  rangeLabel: string
  sessionsHeld: number
  thursdaysHeld: number
  peoplePrayedFor: number
  returningPeople: number
  attendanceRate: number
  noShows: number
  onlineSessions: number
  monthly: { month: string; label: string; held: number; capacity: number }[]
  topics: { topic: PrayerTopic; count: number }[]
  frequent: PersonSummary[]
}

export type ApiErrorCode =
  | "invalid_credentials"
  | "email_taken"
  | "email_not_verified"
  | "invalid_code"
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

/** The single error shape every API call rejects with. */
export interface ApiErrorShape {
  code: ApiErrorCode
  message: string
}
