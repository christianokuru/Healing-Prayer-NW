import { ApiError } from "@/lib/api/errors"
import type { User } from "@/lib/domain/types"

import { mockStore, type MockUserRecord } from "./store"

export const toPublicUser = ({ password: _password, ...u }: MockUserRecord): User => u

export function currentUserRecord(): MockUserRecord | null {
  const id = mockStore.sessionUserId
  if (!id) return null
  return mockStore.read((db) => db.users.find((u) => u.id === id) ?? null)
}

export function requireUser(): MockUserRecord {
  const user = currentUserRecord()
  if (!user) throw new ApiError("unauthenticated", "Please log in again to continue.")
  return user
}

export function requireAdmin(): MockUserRecord {
  const user = requireUser()
  if (user.role !== "admin") throw new ApiError("forbidden", "Only the prayer minister can do that.")
  return user
}
