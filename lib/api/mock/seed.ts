import { addDays, addMonths } from "date-fns"

import { SCHEDULE } from "@/lib/config/ministry"
import { HOUR_MS, sessionDaysBetween, slotStartIso } from "@/lib/domain/time"
import type { BlockedDate, Booking, BookingStatus, PrayerTopic } from "@/lib/domain/types"

import type { MockDbState, MockUserRecord } from "./store"

/**
 * Demo accounts for the mock API only (test values, never real ones).
 * They are listed here and in README.md.
 */
export const DEMO_ACCOUNTS = {
  visitor: { email: "grace@example.com", password: "prayer-demo-1" },
  admin: { email: "janis@example.com", password: "admin-demo-1" },
} as const

export const MOCK_VERIFICATION_CODE = "123456"

const PEOPLE: [string, string, PrayerTopic][] = [
  ["Esther Kim", "esther", "healing"],
  ["David Lowe", "david", "family"],
  ["Naomi Brooks", "naomi", "emotional"],
  ["Isaac Bell", "isaac", "forgiveness"],
  ["Peter Ng", "peter", "deliverance"],
  ["Hannah Price", "hannah", "emotional"],
  ["Michael Tran", "michael", "healing"],
  ["Ruth Campbell", "ruth", "healing"],
  ["Samuel Reid", "samuel", "family"],
  ["Amara Lewis", "amara", "healing"],
  ["Joseph Adeyemi", "joseph", "family"],
  ["Lydia Moore", "lydia", "healing"],
  ["Daniel Okafor", "daniel", "deliverance"],
  ["Sarah Whitfield", "sarah", "emotional"],
  ["Thomas Ferreira", "thomas", "forgiveness"],
  ["Mei Chen", "mei", "healing"],
  ["Abigail Stone", "abigail", "family"],
  ["Jonah Martel", "jonah", "emotional"],
]

const POINTS: Record<PrayerTopic, string[]> = {
  healing: [
    "Healing from chronic back pain, and patience while I recover.",
    "Healing for my mother, who has been in hospital since October.",
    "Strength in my knees and thankfulness for answered prayer.",
    "Relief from migraines that keep me from work.",
    "Peace and healing through my cancer treatment, and courage for the next scan.",
    "Recovery after surgery, and rest for my body.",
  ],
  emotional: [
    "Peace and sleep after a very hard season.",
    "Comfort in grief after losing my brother.",
    "Freedom from anxiety before exams.",
    "Hope again after a long period of feeling low.",
  ],
  family: [
    "Restoration with my son, and wisdom as a parent.",
    "Peace at home and unity in our marriage.",
    "Direction for our family as we move cities.",
    "Healing in my relationship with my sister.",
  ],
  deliverance: [
    "Freedom from fear and nightmares.",
    "Breaking an addiction that has held me for years.",
    "Freedom from heaviness I feel at night.",
  ],
  forgiveness: [
    "Freedom to forgive my father.",
    "To let go of bitterness toward a former friend.",
    "To accept forgiveness and stop carrying guilt.",
  ],
  other: ["Guidance about a new job.", "Clarity for a big decision this month."],
}

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

  const users: MockUserRecord[] = [
    {
      id: "u_admin",
      email: DEMO_ACCOUNTS.admin.email,
      password: DEMO_ACCOUNTS.admin.password,
      fullName: "Janis Bradley",
      phone: "(403) 555-0100",
      role: "admin",
      emailVerified: true,
      createdAt: created,
    },
    {
      id: "u_grace",
      email: DEMO_ACCOUNTS.visitor.email,
      password: DEMO_ACCOUNTS.visitor.password,
      fullName: "Grace Mensah",
      phone: "(403) 555-0142",
      role: "visitor",
      emailVerified: true,
      createdAt: created,
    },
    ...PEOPLE.map(([fullName, handle], i) => ({
      id: `u_${handle}`,
      email: `${handle}@example.com`,
      password: "prayer-demo-1",
      fullName,
      phone: `(403) 555-${String(110 + i).padStart(4, "0")}`,
      role: "visitor" as const,
      emailVerified: true,
      createdAt: created,
    })),
  ]
  const favourite = new Map(PEOPLE.map(([, h, t]) => [`u_${h}`, t]))
  favourite.set("u_grace", "healing")

  const bookings: Booking[] = []
  let n = 0
  const add = (
    userId: string,
    slotStart: string,
    status: BookingStatus,
    extra: Partial<Booking> = {}
  ) => {
    const topic: PrayerTopic =
      extra.topic ?? (rand() < 0.7 ? favourite.get(userId) ?? "other" : pick(Object.keys(POINTS) as PrayerTopic[]))
    const createdAt = iso(new Date(new Date(slotStart).getTime() - (3 + rand() * 20) * 24 * HOUR_MS))
    bookings.push({
      id: `b_seed_${n++}`,
      userId,
      slotStart,
      status,
      mode: "in_person",
      topic,
      prayerPoints: pick(POINTS[topic]),
      createdAt,
      updatedAt: createdAt,
      ...extra,
    })
  }

  const visitorIds = users.filter((u) => u.role === "visitor" && u.id !== "u_grace").map((u) => u.id)
  const times = SCHEDULE.slotTimes

  /* ---------- Past six months ---------- */
  const pastDays = sessionDaysBetween(addMonths(now, -6), addDays(now, -1)).filter(
    (k) => new Date(slotStartIso(k, times[times.length - 1])).getTime() < now.getTime()
  )
  const graceAt: Record<number, Partial<Booking> & { status: BookingStatus }> = {
    [pastDays.length - 3]: { status: "confirmed", topic: "healing", prayerPoints: "Healing from back pain that keeps me from work." },
    [pastDays.length - 7]: {
      status: "confirmed",
      mode: "online",
      topic: "healing",
      onlineReason: "Unwell with a flare-up and unable to travel.",
      zoomLink: "https://zoom.us/j/0000000000",
      prayerPoints: "Relief from back pain while I'm unwell.",
    },
    [pastDays.length - 12]: { status: "cancelled", topic: "family", prayerPoints: "Peace at home and unity in our family." },
  }
  pastDays.forEach((key, dayIndex) => {
    const count = 2 + Math.floor(rand() * 3)
    const slotOrder = [...times].sort(() => rand() - 0.5).slice(0, count)
    const used = new Set<string>()
    slotOrder.forEach((t, i) => {
      const start = slotStartIso(key, t)
      if (i === 0 && graceAt[dayIndex]) {
        const { status, ...extra } = graceAt[dayIndex]
        add("u_grace", start, status, extra)
        return
      }
      let uid = pick(visitorIds)
      while (used.has(uid)) uid = pick(visitorIds)
      used.add(uid)
      const r = rand()
      const status: BookingStatus = r < 0.86 ? "confirmed" : r < 0.93 ? "no_show" : "cancelled"
      const online = rand() < 0.1
      add(uid, start, status, online ? { mode: "online", onlineReason: "Undergoing treatment and unable to travel.", zoomLink: "https://zoom.us/j/0000000000" } : {})
    })
  })

  /* ---------- Upcoming ---------- */
  const upcoming = sessionDaysBetween(now, addMonths(now, 1)).filter(
    (k) => new Date(slotStartIso(k, times[0])).getTime() > now.getTime()
  )
  const plan: [number, string, BookingStatus, Partial<Booking>?][] = [
    [0, "u_ruth", "pending", { topic: "healing", prayerPoints: "Healing for my mother, who has been in hospital since October, and strength for our family." }],
    [0, "u_samuel", "confirmed"],
    [0, "u_amara", "confirmed"],
    [1, "u_peter", "confirmed"],
    [1, "u_grace", "confirmed", { topic: "healing", prayerPoints: "Continued healing from back pain, and peace about my job search." }],
    [1, "u_michael", "pending", { mode: "online", topic: "healing", onlineReason: "Currently in chemotherapy and unable to travel.", prayerPoints: "Healing and peace through my cancer treatment. Courage for the next scan." }],
    [3, "u_hannah", "confirmed"],
    [3, "u_grace", "pending", { topic: "other", prayerPoints: "Guidance about a new job offer, and continued healing." }],
    [3, "u_daniel", "pending"],
    [4, "u_esther", "confirmed"],
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

  return { users, bookings, blocked, verification: {}, resetTokens: {} }
}
