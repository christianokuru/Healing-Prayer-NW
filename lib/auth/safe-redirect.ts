import { ADMIN_HOME } from "@/lib/auth/session-cookie"

/**
 * Where to send the minister after login. Only paths inside the admin area
 * are honoured, so `?next=` can't be used for open redirects.
 */
export function postLoginPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return ADMIN_HOME
  return next === ADMIN_HOME || next.startsWith(`${ADMIN_HOME}/`) || next.startsWith(`${ADMIN_HOME}?`)
    ? next
    : ADMIN_HOME
}
