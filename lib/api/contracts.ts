import type {
  AdminBooking,
  AnalyticsSummary,
  Attendance,
  BlockedDate,
  ManagedBooking,
  Note,
  PersonDetail,
  PersonSummary,
  ThursdayAvailability,
  User,
} from "@/lib/domain/types"

/**
 * The frontend depends only on these interfaces (Dependency Inversion).
 * `mock/` implements them in the browser (demo mode); `live/` calls FastAPI
 * through this site's /api bridge, which forwards the session cookie.
 */

/* ---------- Prayer minister sign-in ---------- */

export interface LoginInput {
  email: string
  password: string
}

export interface AuthApi {
  getSession(): Promise<User | null>
  login(input: LoginInput): Promise<User>
  requestPasswordReset(email: string): Promise<void>
  resetPassword(token: string, password: string): Promise<void>
  logout(): Promise<void>
}

/* ---------- Public booking (no account) ---------- */

export interface CreateBookingInput {
  fullName: string
  email: string
  phone: string
  prayerPoints: string
  slotStart: string
  /** "I can't come in person, please join by Zoom." */
  online: boolean
  onlineReason?: string
  /** Honeypot: real people never fill it in. */
  website?: string
}

export interface CreatedBooking {
  booking: ManagedBooking
  /** Private token for the "manage my booking" link (also emailed). */
  manageToken: string
}

export interface PublicApi {
  getAvailability(): Promise<ThursdayAvailability[]>
  createBooking(input: CreateBookingInput): Promise<CreatedBooking>
  getManagedBooking(token: string): Promise<ManagedBooking>
  /** Cancels (or withdraws a request) with 48h+ notice. */
  cancelManagedBooking(token: string): Promise<ManagedBooking>
  /** Inside 48h: tells the minister they can't come. */
  sendLateNotice(token: string, message?: string): Promise<ManagedBooking>
}

/* ---------- Admin ---------- */

export interface ApproveInput {
  bookingId: string
  zoomLink?: string
}

export interface DeclineInput {
  bookingId: string
  message?: string
}

export interface FollowUpInput {
  bookingId: string
  subject: string
  message: string
}

export interface NoteInput {
  body: string
  personId?: string | null
}

export interface AdminApi {
  listBookings(range?: { from?: string; to?: string }): Promise<AdminBooking[]>
  approve(input: ApproveInput): Promise<AdminBooking>
  decline(input: DeclineInput): Promise<AdminBooking>
  revertDecision(bookingId: string): Promise<AdminBooking>
  /**
   * Records whether the visitor came, once the session has started.
   * Works on confirmed, attended or no-show bookings; `null` clears it back to confirmed.
   */
  setAttendance(bookingId: string, attendance: Attendance | null): Promise<AdminBooking>
  /** A personal email to someone who missed their session. */
  sendFollowUp(input: FollowUpInput): Promise<AdminBooking>
  listBlockedDates(): Promise<BlockedDate[]>
  /** Blocks a session day; active bookings that day are cancelled and emailed. */
  blockDate(date: string, reason?: string): Promise<{ blocked: BlockedDate; affected: number }>
  unblockDate(date: string): Promise<void>
  listPeople(): Promise<PersonSummary[]>
  getPerson(personId: string): Promise<PersonDetail>
  getAnalytics(months?: number): Promise<AnalyticsSummary>
  listNotes(options?: { personId?: string }): Promise<Note[]>
  createNote(input: NoteInput): Promise<Note>
  updateNote(noteId: string, input: NoteInput): Promise<Note>
  deleteNote(noteId: string): Promise<void>
}

export interface Api {
  auth: AuthApi
  public: PublicApi
  admin: AdminApi
}
