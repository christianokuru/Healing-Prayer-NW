import type { AuthApi } from "@/lib/api/contracts"
import { ApiError } from "@/lib/api/errors"
import { writeRoleCookie } from "@/lib/auth/session-cookie"

import { currentAdminRecord, normEmail, toPublicUser } from "./guards"
import { latency, mockStore } from "./store"

/** Only the prayer minister signs in; visitors have no accounts. */
export const mockAuthApi: AuthApi = {
  async getSession() {
    await latency(60, 140)
    const user = currentAdminRecord()
    writeRoleCookie(user ? "admin" : null)
    return user ? toPublicUser(user) : null
  },

  async login({ email, password }) {
    await latency()
    const user = mockStore.read((db) => db.admins.find((u) => u.email === normEmail(email)))
    if (!user || user.password !== password) {
      throw new ApiError("invalid_credentials", "That email and password don't match. Please try again.")
    }
    mockStore.sessionUserId = user.id
    writeRoleCookie("admin")
    return toPublicUser(user)
  },

  async requestPasswordReset(email) {
    await latency()
    mockStore.write((db) => {
      const address = normEmail(email)
      // Always succeed, so the form never reveals who has an account.
      if (db.admins.some((u) => u.email === address)) {
        db.resetTokens[`reset-${address}`] = address
      }
    })
  },

  async resetPassword(token, password) {
    await latency()
    mockStore.write((db) => {
      const address = db.resetTokens[token]
      const u = address && db.admins.find((x) => x.email === address)
      if (!u) throw new ApiError("invalid_token", "This reset link has expired. Please request a new one.")
      u.password = password
      delete db.resetTokens[token]
    })
  },

  async logout() {
    await latency(80, 160)
    mockStore.sessionUserId = null
    writeRoleCookie(null)
  },
}
