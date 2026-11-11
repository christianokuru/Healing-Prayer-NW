import type { AuthApi } from "@/lib/api/contracts"
import { ApiError } from "@/lib/api/errors"
import { writeRoleCookie } from "@/lib/auth/session-cookie"

import { currentUserRecord, requireUser, toPublicUser } from "./guards"
import { MOCK_VERIFICATION_CODE } from "./seed"
import { latency, mockStore, newId } from "./store"

const norm = (email: string) => email.trim().toLowerCase()

function startSession(userId: string, role: "visitor" | "admin") {
  mockStore.sessionUserId = userId
  writeRoleCookie(role)
}

export const mockAuthApi: AuthApi = {
  async getSession() {
    await latency(60, 140)
    const user = currentUserRecord()
    if (!user) {
      writeRoleCookie(null)
      return null
    }
    writeRoleCookie(user.role)
    return toPublicUser(user)
  },

  async login({ email, password }) {
    await latency()
    const user = mockStore.read((db) => db.users.find((u) => u.email === norm(email)))
    if (!user || user.password !== password) {
      throw new ApiError("invalid_credentials", "That email and password don't match. Please try again.")
    }
    if (!user.emailVerified) {
      throw new ApiError("email_not_verified", "Please confirm your email address first.")
    }
    startSession(user.id, user.role)
    return toPublicUser(user)
  },

  async signup({ fullName, email, phone, password }) {
    await latency()
    const address = norm(email)
    mockStore.write((db) => {
      if (db.users.some((u) => u.email === address)) {
        throw new ApiError("email_taken", "An account with this email already exists. Try logging in instead.")
      }
      db.users.push({
        id: newId("u"),
        email: address,
        fullName: fullName.trim(),
        phone: phone.trim(),
        password,
        role: "visitor",
        emailVerified: false,
        createdAt: new Date().toISOString(),
      })
      db.verification[address] = MOCK_VERIFICATION_CODE
    })
    return { email: address }
  },

  async verifyEmail(email, code) {
    await latency()
    const address = norm(email)
    const user = mockStore.write((db) => {
      const u = db.users.find((x) => x.email === address)
      if (!u) throw new ApiError("not_found", "We couldn't find that account. Please sign up again.")
      if (u.emailVerified) return u
      if (db.verification[address] !== code.trim()) {
        throw new ApiError("invalid_code", "That code isn't right. Check the email and try again.")
      }
      u.emailVerified = true
      delete db.verification[address]
      return u
    })
    startSession(user.id, user.role)
    return toPublicUser(user)
  },

  async resendVerification(email) {
    await latency()
    mockStore.write((db) => {
      db.verification[norm(email)] = MOCK_VERIFICATION_CODE
    })
  },

  async requestPasswordReset(email) {
    await latency()
    mockStore.write((db) => {
      const address = norm(email)
      // Always succeed, so the form never reveals who has an account.
      if (db.users.some((u) => u.email === address)) {
        db.resetTokens[`reset-${address}`] = address
      }
    })
  },

  async resetPassword(token, password) {
    await latency()
    mockStore.write((db) => {
      const address = db.resetTokens[token]
      const u = address && db.users.find((x) => x.email === address)
      if (!u) throw new ApiError("invalid_token", "This reset link has expired. Please request a new one.")
      u.password = password
      delete db.resetTokens[token]
    })
  },

  async updateProfile({ fullName, phone }) {
    await latency()
    const me = requireUser()
    const updated = mockStore.write((db) => {
      const u = db.users.find((x) => x.id === me.id)!
      u.fullName = fullName.trim()
      u.phone = phone.trim()
      return u
    })
    return toPublicUser(updated)
  },

  async changePassword({ currentPassword, newPassword }) {
    await latency()
    const me = requireUser()
    mockStore.write((db) => {
      const u = db.users.find((x) => x.id === me.id)!
      if (u.password !== currentPassword) {
        throw new ApiError("invalid_credentials", "Your current password isn't right.")
      }
      u.password = newPassword
    })
  },

  async logout() {
    await latency(80, 160)
    mockStore.sessionUserId = null
    writeRoleCookie(null)
  },
}
