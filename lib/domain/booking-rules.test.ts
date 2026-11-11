import { describe, expect, it } from "vitest"

import { postLoginPath } from "@/lib/auth/safe-redirect"
import { stepsFor, wizardReducer } from "@/features/booking/state"

import {
  buildAvailability,
  canChangeThemselves,
  canSendLateNotice,
  displayStatus,
  isInBookingWindow,
  userHasBookingOnDay,
} from "./booking-rules"
import { dateKey, fmt, sessionDaysBetween, slotStartIso } from "./time"
import type { Booking } from "./types"

// Wednesday, Nov 11 2026, 11:00 in Calgary (UTC-6).
const NOW = new Date("2026-11-11T17:00:00Z")

const booking = (over: Partial<Booking>): Booking => ({
  id: "b1",
  userId: "u1",
  slotStart: slotStartIso("2026-11-19", "19:30"),
  status: "confirmed",
  mode: "in_person",
  topic: "healing",
  prayerPoints: "x",
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...over,
})

describe("Calgary time", () => {
  it("keeps sessions at 7 pm Calgary time all year, whatever the UTC offset", () => {
    // Uses the IANA zone, so offset changes (DST, or Alberta's 2026 move to
    // year-round UTC-6 in tzdata 2026e) never shift the local session time.
    for (const day of ["2025-01-16", "2025-11-20", "2026-07-16", "2026-11-19", "2027-01-14"]) {
      const iso = slotStartIso(day, "19:00")
      expect(fmt.time(iso)).toBe("7:00 pm")
      expect(dateKey(iso)).toBe(day)
    }
  })

  it("formats in Calgary regardless of the device time zone", () => {
    const iso = slotStartIso("2026-11-19", "19:30")
    expect(fmt.dateLong(iso)).toBe("Thursday, November 19")
    expect(fmt.time(iso)).toBe("7:30 pm")
    expect(dateKey(iso)).toBe("2026-11-19")
  })

  it("lists only Thursdays", () => {
    expect(sessionDaysBetween(NOW, new Date("2026-12-11T00:00:00Z"))).toEqual([
      "2026-11-12",
      "2026-11-19",
      "2026-11-26",
      "2026-12-03",
      "2026-12-10",
    ])
  })
})

describe("booking window", () => {
  it("needs 48 hours notice", () => {
    const slot = slotStartIso("2026-11-19", "19:00")
    const at = (hoursBefore: number) => new Date(new Date(slot).getTime() - hoursBefore * 3600e3)
    expect(isInBookingWindow(slot, at(48))).toBe(true)
    expect(isInBookingWindow(slot, at(47.9))).toBe(false)
    expect(isInBookingWindow(slotStartIso("2026-11-12", "19:00"), NOW)).toBe(false) // ~33h away
  })

  it("allows at most one month ahead", () => {
    expect(isInBookingWindow(slotStartIso("2026-12-10", "20:30"), NOW)).toBe(true)
    expect(isInBookingWindow(slotStartIso("2026-12-17", "19:00"), NOW)).toBe(false)
  })
})

describe("one booking per person per Thursday", () => {
  it("finds an active booking on the same day", () => {
    const all = [booking({})]
    expect(userHasBookingOnDay(all, "u1", "2026-11-19")).toBeDefined()
    expect(userHasBookingOnDay(all, "u2", "2026-11-19")).toBeUndefined()
    expect(userHasBookingOnDay(all, "u1", "2026-11-19", "b1")).toBeUndefined()
    expect(userHasBookingOnDay([booking({ status: "cancelled" })], "u1", "2026-11-19")).toBeUndefined()
  })
})

describe("availability", () => {
  const days = buildAvailability({
    bookings: [
      booking({ id: "mine", userId: "me", status: "pending", slotStart: slotStartIso("2026-11-26", "19:00") }),
      booking({ id: "a", userId: "x", slotStart: slotStartIso("2026-12-03", "19:00") }),
      booking({ id: "b", userId: "y", slotStart: slotStartIso("2026-12-03", "19:30") }),
      booking({ id: "c", userId: "z", slotStart: slotStartIso("2026-12-03", "20:00") }),
      booking({ id: "d", userId: "w", slotStart: slotStartIso("2026-12-03", "20:30") }),
    ],
    blocked: [{ date: "2026-12-10", createdAt: NOW.toISOString() }],
    userId: "me",
    now: NOW,
  })
  const state = Object.fromEntries(days.map((d) => [d.date, d.state]))

  it("marks each Thursday correctly", () => {
    expect(state).toEqual({
      "2026-11-12": "closed",
      "2026-11-19": "open",
      "2026-11-26": "booked_by_me",
      "2026-12-03": "full",
      "2026-12-10": "cancelled",
    })
  })

  it("lets a reschedule ignore the booking being moved", () => {
    const moved = buildAvailability({
      bookings: [booking({ id: "mine", userId: "me", slotStart: slotStartIso("2026-11-26", "19:00") })],
      blocked: [],
      userId: "me",
      now: NOW,
      excludeBookingId: "mine",
    })
    expect(moved.find((d) => d.date === "2026-11-26")?.state).toBe("open")
  })
})

describe("changes and statuses", () => {
  it("allows self-service changes only with 48h notice", () => {
    expect(canChangeThemselves(booking({}), NOW)).toBe(true)
    const soon = booking({ slotStart: slotStartIso("2026-11-12", "19:00") })
    const lateNow = new Date("2026-11-12T10:00:00Z")
    expect(canChangeThemselves(soon, lateNow)).toBe(false)
    expect(canSendLateNotice(soon, lateNow)).toBe(true)
  })

  it("derives completed and expired from time", () => {
    const later = new Date("2026-11-21T00:00:00Z")
    expect(displayStatus(booking({}), later)).toBe("completed")
    expect(displayStatus(booking({ status: "pending" }), later)).toBe("expired")
    expect(displayStatus(booking({ status: "no_show" }), later)).toBe("no_show")
  })
})

describe("booking wizard", () => {
  it("walks the steps and clears the time when the day changes", () => {
    const steps = stepsFor(false)
    let s = wizardReducer({ step: "day" }, { type: "pickDate", date: "2026-11-19" })
    s = wizardReducer(s, { type: "next", steps })
    s = wizardReducer(s, { type: "pickSlot", slotStart: "x" })
    expect(s).toMatchObject({ step: "time", slotStart: "x" })
    s = wizardReducer(s, { type: "pickDate", date: "2026-11-26" })
    expect(s.slotStart).toBeUndefined()
    s = wizardReducer(s, { type: "slotLost", resetDate: true })
    expect(s).toMatchObject({ step: "day", date: undefined })
  })

  it("skips prayer points when rescheduling", () => {
    expect(stepsFor(true)).toEqual(["day", "time", "review"])
  })
})

describe("post-login redirect", () => {
  it("only honours safe paths inside the person's own area", () => {
    expect(postLoginPath("visitor", "/dashboard/book")).toBe("/dashboard/book")
    expect(postLoginPath("visitor", "/admin")).toBe("/dashboard")
    expect(postLoginPath("admin", "//evil.example")).toBe("/admin")
    expect(postLoginPath("admin", "https://evil.example")).toBe("/admin")
    expect(postLoginPath("admin", null)).toBe("/admin")
  })
})
