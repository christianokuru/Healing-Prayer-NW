import { addDays, addMonths } from "date-fns"

import { SCHEDULE } from "@/lib/config/ministry"
import { HOUR_MS, dateKey, sessionDaysBetween, slotStartIso } from "@/lib/domain/time"
import type { BlockedDate, BookingStatus, Note } from "@/lib/domain/types"

import type { MockBookingRecord, MockDbState, MockPersonRecord } from "./store"

/**
 * The prayer minister's demo sign-in for the mock API only (test values,
 * never real ones). Listed here and in README.md. Visitors have no accounts.
 */
export const DEMO_ADMIN = { email: "janis@example.com", password: "admin-demo-1" } as const

const PEOPLE: [string, string][] = [
  ["Grace Mensah", "grace"],
  ["Esther Kim", "esther"],
  ["David Lowe", "david"],
  ["Naomi Brooks", "naomi"],
  ["Isaac Bell", "isaac"],
  ["Peter Ng", "peter"],
  ["Hannah Price", "hannah"],
  ["Michael Tran", "michael"],
  ["Ruth Campbell", "ruth"],
  ["Samuel Reid", "samuel"],
  ["Amara Lewis", "amara"],
  ["Joseph Adeyemi", "joseph"],
  ["Lydia Moore", "lydia"],
  ["Daniel Okafor", "daniel"],
  ["Sarah Whitfield", "sarah"],
  ["Thomas Ferreira", "thomas"],
  ["Mei Chen", "mei"],
  ["Abigail Stone", "abigail"],
  ["Jonah Martel", "jonah"],
]

const POINTS = [
  "Healing from chronic back pain, and patience while I recover.",
  "Healing for my mother, who has been in hospital since October.",
  "Strength in my knees and thankfulness for answered prayer.",
  "Relief from migraines that keep me from work.",
  "Peace and healing through my cancer treatment, and courage for the next scan.",
  "Recovery after surgery, and rest for my body.",
  "Peace and sleep after a very hard season.",
  "Comfort in grief after losing my brother.",
  "Hope again after a long period of feeling low.",
  "Restoration with my son, and wisdom as a parent.",
  "Peace at home and unity in our marriage.",
  "Direction for our family as we move cities.",
  "Freedom from fear and nightmares.",
  "Freedom to forgive my father.",
  "To let go of bitterness toward a former friend.",
  "Guidance about a new job.",
]

/** Deterministic PRNG so the demo looks the same on every reset. */
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createSeed(now: Date): Omit<MockDbState, "version"> {
  const rand = rng(2026)
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]
  const iso = (d: Date) => d.toISOString()
  const created = iso(addMonths(now, -7))

  const admins: MockDbState["admins"] = [
    {
      id: "u_admin",
      email: DEMO_ADMIN.email,
      password: DEMO_ADMIN.password,
      fullName: "Janis Bradley",
      role: "admin",
      createdAt: created,
    },
  ]
  const people: MockPersonRecord[] = PEOPLE.map(([fullName, handle], i) => ({
    id: `p_${handle}`,
    email: `${handle}@example.com`,
    fullName,
    phone: `(403) 555-${String(110 + i).padStart(4, "0")}`,
    createdAt: created,
  }))

  const bookings: MockBookingRecord[] = []
  let n = 0
  const add = (
    personId: string,
    slotStart: string,
    status: BookingStatus,
    extra: Partial<MockBookingRecord> = {}
  ) => {
    const createdAt = iso(new Date(new Date(slotStart).getTime() - (3 + rand() * 20) * 24 * HOUR_MS))
    const id = `b_seed_${n++}`
    bookings.push({
      id,
      personId,
      slotStart,
      status,
      mode: "in_person",
      prayerPoints: pick(POINTS),
      // Stable demo tokens so links in the demo keep working after a reset.
      manageToken: `demo-${id}`,
      createdAt,
      updatedAt: createdAt,
      ...extra,
    })
  }

  const visitorIds = people.filter((p) => p.id !== "p_grace").map((p) => p.id)
  const times = SCHEDULE.slotTimes

  /* ---------- Past six months ---------- */
  const pastDays = sessionDaysBetween(addMonths(now, -6), addDays(now, -1)).filter(
    (k) => new Date(slotStartIso(k, times[times.length - 1])).getTime() < now.getTime()
  )
  const graceAt: Record<number, Partial<MockBookingRecord> & { status: BookingStatus }> = {
    [pastDays.length - 3]: { status: "attended", prayerPoints: "Healing from back pain that keeps me from work." },
    [pastDays.length - 7]: {
      status: "attended",
      mode: "online",
      onlineReason: "Unwell with a flare-up and unable to travel.",
      zoomLink: "https://zoom.us/j/0000000000",
      prayerPoints: "Relief from back pain while I'm unwell.",
    },
    [pastDays.length - 12]: { status: "cancelled", prayerPoints: "Peace at home and unity in our family." },
  }
  pastDays.forEach((key, dayIndex) => {
    const count = 2 + Math.floor(rand() * 3)
    const slotOrder = [...times].sort(() => rand() - 0.5).slice(0, count)
    const used = new Set<string>()
    slotOrder.forEach((t, i) => {
      const start = slotStartIso(key, t)
      if (i === 0 && graceAt[dayIndex]) {
        const { status, ...extra } = graceAt[dayIndex]
        add("p_grace", start, status, extra)
        return
      }
      let uid = pick(visitorIds)
      while (used.has(uid)) uid = pick(visitorIds)
      used.add(uid)
      const r = rand()
      // The most recent Thursday is left unmarked so the attendance card has work in it.
      const lastThursday = dayIndex === pastDays.length - 1
      const status: BookingStatus =
        r < 0.86 ? (lastThursday ? "confirmed" : "attended") : r < 0.93 && !lastThursday ? "no_show" : "cancelled"
      const online = rand() < 0.1
      add(uid, start, status, online ? { mode: "online", onlineReason: "Undergoing treatment and unable to travel.", zoomLink: "https://zoom.us/j/0000000000" } : {})
    })
  })

  /* ---------- Upcoming ---------- */
  const upcoming = sessionDaysBetween(now, addMonths(now, 1)).filter(
    (k) => new Date(slotStartIso(k, times[0])).getTime() > now.getTime()
  )
  const plan: [number, string, BookingStatus, Partial<MockBookingRecord>?][] = [
    [0, "p_ruth", "pending", { prayerPoints: "Healing for my mother, who has been in hospital since October, and strength for our family." }],
    [0, "p_samuel", "confirmed"],
    [0, "p_amara", "confirmed"],
    [1, "p_peter", "confirmed"],
    [1, "p_grace", "confirmed", { prayerPoints: "Continued healing from back pain, and peace about my job search." }],
    [1, "p_michael", "pending", { mode: "online", onlineReason: "Currently in chemotherapy and unable to travel.", prayerPoints: "Healing and peace through my cancer treatment. Courage for the next scan." }],
    [3, "p_hannah", "confirmed"],
    [3, "p_grace", "pending", { prayerPoints: "Guidance about a new job offer, and continued healing." }],
    [3, "p_daniel", "pending"],
    [4, "p_esther", "confirmed"],
  ]
  const slotCursor: Record<number, number> = {}
  for (const [dayIdx, uid, status, extra] of plan) {
    const key = upcoming[dayIdx]
    if (!key) continue
    const t = times[(slotCursor[dayIdx] = (slotCursor[dayIdx] ?? -1) + 1)]
    if (!t) continue
    add(uid, slotStartIso(key, t), status, extra)
  }

  const blocked: BlockedDate[] = upcoming[2]
    ? [{ date: upcoming[2], reason: "Away at a ministry retreat", createdAt: iso(now) }]
    : []

  // A recent no-show nobody has followed up yet, so the attendance card has one.
  const recentKey = pastDays.at(-2)
  const recentMiss = bookings.find((b) => dateKey(b.slotStart) === recentKey && b.status === "attended")
  if (recentMiss) recentMiss.status = "no_show"

  const notes: Note[] = [
    {
      id: "n_seed_1",
      body: "Grace asked for prayer about her job search too. Follow up next time she comes.",
      personId: "p_grace",
      personName: "Grace Mensah",
      createdAt: iso(addDays(now, -9)),
      updatedAt: iso(addDays(now, -9)),
    },
    {
      id: "n_seed_2",
      body: "Ask the college about the side door being locked after 7 pm. Two people had trouble getting in.",
      createdAt: iso(addDays(now, -3)),
      updatedAt: iso(addDays(now, -3)),
    },
  ]

  return { admins, people, bookings, blocked, notes, resetTokens: {} }
}
