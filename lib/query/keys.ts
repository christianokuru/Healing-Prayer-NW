/** Central query keys so invalidation stays consistent everywhere. */
export const qk = {
  session: ["session"] as const,
  visitor: {
    all: ["visitor"] as const,
    bookings: ["visitor", "bookings"] as const,
    availability: (excludeBookingId?: string) =>
      ["visitor", "availability", excludeBookingId ?? null] as const,
  },
  admin: {
    all: ["admin"] as const,
    bookings: ["admin", "bookings"] as const,
    blocked: ["admin", "blocked"] as const,
    people: ["admin", "people"] as const,
    person: (id: string) => ["admin", "person", id] as const,
    analytics: (months: number) => ["admin", "analytics", months] as const,
  },
}
