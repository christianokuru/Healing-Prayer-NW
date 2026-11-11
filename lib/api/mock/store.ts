import type { BlockedDate, Booking, User } from "@/lib/domain/types"

import { createSeed } from "./seed"

export interface MockUserRecord extends User {
  password: string
}

export interface MockDbState {
  version: number
  users: MockUserRecord[]
  bookings: Booking[]
  blocked: BlockedDate[]
  /** email -> pending verification code */
  verification: Record<string, string>
  /** reset token -> email */
  resetTokens: Record<string, string>
}

const DB_KEY = "hpn.mock-db"
const SESSION_KEY = "hpn.mock-session"
const DB_VERSION = 1

const hasStorage = () => typeof window !== "undefined" && !!window.localStorage

/**
 * Browser-persisted mock database. Only the mock adapter touches it,
 * so swapping to the live API removes it entirely.
 */
class MockStore {
  private state: MockDbState | null = null

  private load(): MockDbState {
    if (this.state) return this.state
    if (hasStorage()) {
      try {
        const raw = localStorage.getItem(DB_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as MockDbState
          if (parsed.version === DB_VERSION) return (this.state = parsed)
        }
      } catch {
        // Corrupt or blocked storage: fall through to a fresh seed.
      }
    }
    this.state = { version: DB_VERSION, ...createSeed(new Date()) }
    this.persist()
    return this.state
  }

  private persist() {
    if (!hasStorage() || !this.state) return
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.state))
    } catch {
      // Storage full or blocked; the in-memory copy still works this session.
    }
  }

  read<T>(selector: (db: MockDbState) => T): T {
    return structuredClone(selector(this.load()))
  }

  write<T>(mutator: (db: MockDbState) => T): T {
    const db = this.load()
    const result = mutator(db)
    this.persist()
    return structuredClone(result)
  }

  reset() {
    this.state = null
    if (hasStorage()) {
      localStorage.removeItem(DB_KEY)
      localStorage.removeItem(SESSION_KEY)
    }
  }

  get sessionUserId(): string | null {
    if (!hasStorage()) return null
    try {
      return localStorage.getItem(SESSION_KEY)
    } catch {
      return null
    }
  }

  set sessionUserId(id: string | null) {
    if (!hasStorage()) return
    try {
      if (id) localStorage.setItem(SESSION_KEY, id)
      else localStorage.removeItem(SESSION_KEY)
    } catch {
      // ignore
    }
  }
}

export const mockStore = new MockStore()

let counter = 0
export const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Simulated network latency so loading states are real. */
export const latency = (min = 180, max = 420) =>
  new Promise<void>((r) => setTimeout(r, min + Math.random() * (max - min)))
