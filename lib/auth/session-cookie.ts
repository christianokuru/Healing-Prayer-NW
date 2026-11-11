import type { Role } from "@/lib/domain/types"

/**
 * A small, non-sensitive cookie that only tells `proxy.ts` whether someone
 * is signed in and with which role, so it can redirect before rendering.
 * It is an *optimistic* hint: real authorization always happens in the API.
 *
 * Mock mode: set from the browser. Live mode: the Next.js server sets it
 * next to the httpOnly FastAPI session cookie at login.
 */
export const ROLE_COOKIE = "hpn_role"

export const homeFor = (role: Role) => (role === "admin" ? "/admin" : "/dashboard")

export function writeRoleCookie(role: Role | null) {
  if (typeof document === "undefined") return
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = role
    ? `${ROLE_COOKIE}=${role}; Path=/; Max-Age=${60 * 60 * 24 * 14}; SameSite=Lax${secure}`
    : `${ROLE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
}

export function isRole(v: string | undefined): v is Role {
  return v === "visitor" || v === "admin"
}
