import { describe, expect, it } from "vitest"

import { postLoginPath } from "@/lib/auth/safe-redirect"
import { STEPS, wizardReducer } from "@/features/booking/state"

import {
  adminStatus,
  buildAvailability,
  canChangeThemselves,
  canMarkAttendance,
  canSendLateNotice,
  displayStatus,
  isInBookingWindow,
  needsAttendance,
  canSendFollowUp,
  personHasBookingOnDay,
  slotIsFree,
} from "./booking-rules"
import { dateKey, fmt, sessionDaysBetween, slotStartIso } from "./time"
import type { Booking } from "./types"

// Wednesday, Nov 11 2026, 11:00 in Calgary (UTC-6).
const NOW = new Date("2026-11-11T17:00:00Z")

const booking = (over: Partial<Booking>): Booking => ({
  id: "b1",
  personId: "p1",
  slotStart: slotStartIso("2026-11-19", "19:30"),
  status: "confirmed",
  mode: "in_person",
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

describe("one booking per person (email) per Thursday", () => {
  it("finds an active booking on the same day", () => {
    const all = [booking({})]
    expect(personHasBookingOnDay(all, "p1", "2026-11-19")).toBeDefined()
    expect(personHasBookingOnDay(all, "p2", "2026-11-19")).toBeUndefined()
    expect(personHasBookingOnDay(all, "p1", "2026-11-19", "b1")).toBeUndefined()
    expect(personHasBookingOnDay([booking({ status: "cancelled" })], "p1", "2026-11-19")).toBeUndefined()
  })
})

describe("public availability", () => {
  const days = buildAvailability({
    bookings: [
      booking({ id: "held", status: "pending", slotStart: slotStartIso("2026-11-26", "19:00") }),
      booking({ id: "a", personId: "x", slotStart: slotStartIso("2026-12-03", "19:00") }),
      booking({ id: "b", personId: "y", slotStart: slotStartIso("2026-12-03", "19:30") }),
      booking({ id: "c", personId: "z", slotStart: slotStartIso("2026-12-03", "20:00") }),
      booking({ id: "d", personId: "w", slotStart: slotStartIso("2026-12-03", "20:30") }),
    ],
    blocked: [{ date: "2026-12-10", createdAt: NOW.toISOString() }],
    now: NOW,
  })
  const state = Object.fromEntries(days.map((d) => [d.date, d.state]))

  it("marks each Thursday correctly", () => {
    expect(state).toEqual({
      "2026-11-12": "closed",
      "2026-11-19": "open",
      "2026-11-26": "open",
      "2026-12-03": "full",
      "2026-12-10": "cancelled",
    })
  })

  it("holds a pending request's slot without saying whose it is", () => {
    const nov26 = days.find((d) => d.date === "2026-11-26")!
    expect(nov26.openCount).toBe(3)
    expect(nov26.slots[0]).toEqual({ start: slotStartIso("2026-11-26", "19:00"), state: "taken" })
    expect(JSON.stringify(days)).not.toContain("held")
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

describe("attendance", () => {
  const start = slotStartIso("2026-11-19", "19:30")
  const before = new Date(new Date(start).getTime() - 60_000)
  const during = new Date(new Date(start).getTime() + 10 * 60_000)
  const after = new Date("2026-11-21T00:00:00Z")

  it("can be recorded from the moment an approved session starts, not before", () => {
    expect(canMarkAttendance(booking({}), before)).toBe(false)
    expect(canMarkAttendance(booking({}), during)).toBe(true)
    expect(canMarkAttendance(booking({ status: "pending" }), after)).toBe(false)
    expect(canMarkAttendance(booking({ status: "cancelled" }), after)).toBe(false)
  })

  it("can be corrected after it has been recorded", () => {
    expect(canMarkAttendance(booking({ status: "attended" }), after)).toBe(true)
    expect(canMarkAttendance(booking({ status: "no_show" }), after)).toBe(true)
  })

  it("flags started, unmarked sessions for the minister only", () => {
    expect(needsAttendance(booking({}), during)).toBe(true)
    expect(needsAttendance(booking({ status: "attended" }), after)).toBe(false)
    expect(adminStatus(booking({}), after)).toBe("unmarked")
    expect(adminStatus(booking({ status: "attended" }), after)).toBe("completed")
    expect(adminStatus(booking({ status: "no_show" }), after)).toBe("no_show")
    // Visitors never see "unmarked".
    expect(displayStatus(booking({}), after)).toBe("completed")
    expect(displayStatus(booking({ status: "attended" }), after)).toBe("completed")
  })

  it("keeps the slot taken once attendance is recorded", () => {
    expect(slotIsFree([booking({ status: "attended" })], start)).toBe(false)
    expect(slotIsFree([booking({ status: "no_show" })], start)).toBe(false)
  })
})

describe("booking wizard", () => {
  it("walks the steps and clears the time when the day changes", () => {
    expect(STEPS).toEqual(["day", "time", "details", "review"])
    let s = wizardReducer({ step: "day" }, { type: "pickDate", date: "2026-11-19" })
    s = wizardReducer(s, { type: "next" })
    s = wizardReducer(s, { type: "pickSlot", slotStart: "x" })
    expect(s).toMatchObject({ step: "time", slotStart: "x" })
    s = wizardReducer(s, { type: "pickDate", date: "2026-11-26" })
    expect(s.slotStart).toBeUndefined()
    s = wizardReducer(s, { type: "slotLost", resetDate: true })
    expect(s).toMatchObject({ step: "day", date: undefined })
  })

})

describe("follow-up emails", () => {
  it("are only for people marked as didn't come", () => {
    expect(canSendFollowUp(booking({ status: "no_show" }))).toBe(true)
    expect(canSendFollowUp(booking({ status: "attended" }))).toBe(false)
    expect(canSendFollowUp(booking({}))).toBe(false)
  })
})

describe("post-login redirect", () => {
  it("only honours safe paths inside the admin area", () => {
    expect(postLoginPath("/admin/notes")).toBe("/admin/notes")
    expect(postLoginPath("/manage/abc")).toBe("/admin")
    expect(postLoginPath("//evil.example")).toBe("/admin")
    expect(postLoginPath("https://evil.example")).toBe("/admin")
    expect(postLoginPath(null)).toBe("/admin")
  })
})
