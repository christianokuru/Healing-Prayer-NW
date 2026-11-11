import { homeFor } from "@/lib/auth/session-cookie"
import type { Role } from "@/lib/domain/types"

/**
 * Where to send someone after login. Only same-site paths inside their
 * own area are honoured, so `?next=` can't be used for open redirects.
 */
export function postLoginPath(role: Role, next: string | null): string {
  const home = homeFor(role)
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return home
  return next === home || next.startsWith(`${home}/`) || next.startsWith(`${home}?`) ? next : home
}
