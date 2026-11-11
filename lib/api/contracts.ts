import type {
  AdminBooking,
  AnalyticsSummary,
  AttendanceMode,
  BlockedDate,
  Booking,
  PersonDetail,
  PersonSummary,
  PrayerTopic,
  ThursdayAvailability,
  User,
} from "@/lib/domain/types"

/**
 * The frontend depends only on these interfaces (Dependency Inversion).
 * `mock/` implements them today; a `live/` adapter that calls the
 * Next.js server (which forwards the FastAPI session cookie) replaces it later.
 */

export interface LoginInput {
  email: string
  password: string
}

export interface SignupInput {
  fullName: string
  email: string
  phone: string
  password: string
}

export interface ProfileInput {
  fullName: string
  phone: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface AuthApi {
  getSession(): Promise<User | null>
  login(input: LoginInput): Promise<User>
  signup(input: SignupInput): Promise<{ email: string }>
  verifyEmail(email: string, code: string): Promise<User>
  resendVerification(email: string): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  resetPassword(token: string, password: string): Promise<void>
  updateProfile(input: ProfileInput): Promise<User>
  changePassword(input: ChangePasswordInput): Promise<void>
  logout(): Promise<void>
}

export interface CreateBookingInput {
  slotStart: string
  mode: AttendanceMode
  topic: PrayerTopic
  prayerPoints: string
  onlineReason?: string
}

export interface RescheduleInput {
  bookingId: string
  slotStart: string
}

export interface VisitorApi {
  getAvailability(options?: { excludeBookingId?: string }): Promise<ThursdayAvailability[]>
  listMyBookings(): Promise<Booking[]>
  createBooking(input: CreateBookingInput): Promise<Booking>
  requestReschedule(input: RescheduleInput): Promise<Booking>
  /** Cancels a booking (or withdraws a pending request) with 48h+ notice. */
  cancelBooking(bookingId: string): Promise<Booking>
  /** Inside 48h: tells the minister the visitor can't come. */
  sendLateNotice(bookingId: string, message?: string): Promise<Booking>
}

export interface ApproveInput {
  bookingId: string
  zoomLink?: string
}

export interface DeclineInput {
  bookingId: string
  message?: string
}

export interface AdminApi {
  listBookings(range?: { from?: string; to?: string }): Promise<AdminBooking[]>
  approve(input: ApproveInput): Promise<AdminBooking>
  decline(input: DeclineInput): Promise<AdminBooking>
  revertDecision(bookingId: string): Promise<AdminBooking>
  markNoShow(bookingId: string): Promise<AdminBooking>
  undoNoShow(bookingId: string): Promise<AdminBooking>
  listBlockedDates(): Promise<BlockedDate[]>
  /** Blocks a session day; active bookings that day are cancelled and emailed. */
  blockDate(date: string, reason?: string): Promise<{ blocked: BlockedDate; affected: number }>
  unblockDate(date: string): Promise<void>
  listPeople(): Promise<PersonSummary[]>
  getPerson(personId: string): Promise<PersonDetail>
  getAnalytics(months?: number): Promise<AnalyticsSummary>
}

export interface Api {
  auth: AuthApi
  visitor: VisitorApi
  admin: AdminApi
}
