import type { Role } from "@/lib/domain/types"

/**
 * A small, non-sensitive cookie that only tells `proxy.ts` whether the
 * prayer minister is signed in, so it can redirect before rendering.
 * It is an *optimistic* hint: real authorization always happens in the API.
 *
 * Set from the browser in both modes, kept in step with what the API says
 * (in live mode, next to FastAPI's httpOnly session cookie).
 */
export const ROLE_COOKIE = "hpn_role"

export const ADMIN_HOME = "/admin"

export function writeRoleCookie(role: Role | null) {
  if (typeof document === "undefined") return
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = role
    ? `${ROLE_COOKIE}=${role}; Path=/; Max-Age=${60 * 60 * 24 * 14}; SameSite=Lax${secure}`
    : `${ROLE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
}

export const isAdminCookie = (v: string | undefined) => v === "admin"
