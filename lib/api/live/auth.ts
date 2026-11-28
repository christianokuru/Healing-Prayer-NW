import type { AuthApi } from "@/lib/api/contracts"
import { isApiError } from "@/lib/api/errors"
import { writeRoleCookie } from "@/lib/auth/session-cookie"
import type { User } from "@/lib/domain/types"

import { request } from "./http"

/**
 * The real session is FastAPI's httpOnly cookie. The small role cookie is only
 * a hint for `proxy.ts`, kept in step with what the API says.
 */
export const liveAuthApi: AuthApi = {
  async getSession() {
    try {
      const user = await request<User>("GET", "/auth/me")
      writeRoleCookie(user.role)
      return user
    } catch (e) {
      if (isApiError(e) && e.code === "unauthenticated") {
        writeRoleCookie(null)
        return null
      }
      throw e
    }
  },

  async login(input) {
    const user = await request<User>("POST", "/auth/login", { body: input })
    writeRoleCookie(user.role)
    return user
  },

  async requestPasswordReset(email) {
    await request<void>("POST", "/auth/forgot-password", { body: { email } })
  },

  async resetPassword(token, password) {
    await request<void>("POST", "/auth/reset-password", { body: { token, password } })
  },

  async logout() {
    try {
      await request<void>("POST", "/auth/logout")
    } catch (e) {
      // Already signed out on the server: that's what we wanted.
      if (!(isApiError(e) && e.code === "unauthenticated")) throw e
    } finally {
      writeRoleCookie(null)
    }
  },
}
