/** Central query keys so invalidation stays consistent everywhere. */
export const qk = {
  session: ["session"] as const,
  public: {
    all: ["public"] as const,
    availability: ["public", "availability"] as const,
    managed: (token: string) => ["public", "managed", token] as const,
  },
  admin: {
    all: ["admin"] as const,
    bookings: ["admin", "bookings"] as const,
    blocked: ["admin", "blocked"] as const,
    people: ["admin", "people"] as const,
    person: (id: string) => ["admin", "person", id] as const,
    analytics: (months: number) => ["admin", "analytics", months] as const,
    notes: (personId?: string) => ["admin", "notes", personId ?? "all"] as const,
  },
}
