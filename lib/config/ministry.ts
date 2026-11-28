/**
 * Ministry-wide constants. Anything the client may change later
 * (address, schedule, limits) lives here so it is edited in one place.
 */
export const MINISTRY = {
  name: "Healing Prayer Northwest",
  shortName: "Healing Prayer",
  tagline: "Prayer ministry · Calgary",
  timeZone: "America/Edmonton",
  location: {
    name: "Alberta Bible College",
    street: "635 Northmount Dr NW",
    city: "Calgary, AB T2K 3J6",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Alberta+Bible+College+635+Northmount+Dr+NW+Calgary+AB",
  },
  // TODO(client): replace with the ministry's real contact email once provided.
  contactEmail: "prayer@example.com",
} as const

/**
 * Privacy notice status. TODO(client): Janis reviews the wording (and confirms
 * where the data is hosted), then set `reviewed: true` and the date.
 */
export const PRIVACY = {
  reviewed: false,
  /** Shown as written: a fixed label keeps the page fully static. */
  lastUpdated: "November 28, 2026",
} as const

export const SCHEDULE = {
  /** 0 = Sunday … 4 = Thursday */
  weekday: 4,
  weekdayName: "Thursday",
  /** Local (Calgary) start times, 24h. */
  slotTimes: ["19:00", "19:30", "20:00", "20:30"] as const,
  sessionMinutes: 30,
  /** Earliest a visitor can book before a session. */
  minNoticeHours: 48,
  /** Latest a visitor can book ahead. */
  maxAdvanceMonths: 1,
  /** Visitors can cancel from their link until this many hours before. */
  changeNoticeHours: 48,
  hoursLabel: "7:00 – 9:00 pm",
  /** How often the booking page re-checks which times are still free (the API suggests 10s). */
  slotPollSeconds: 10,
} as const

export const LIMITS = {
  prayerPointsMax: 500,
  onlineReasonMax: 200,
  declineMessageMax: 300,
  followUpMax: 2000,
  noteMax: 5000,
  nameMax: 100,
  phoneMax: 32,
  passwordMin: 8,
} as const

export const CRISIS = {
  emergency: "911",
  crisisLine: "9-8-8",
} as const
