import { NextResponse, type NextRequest } from "next/server"

import { ADMIN_HOME, ROLE_COOKIE, isAdminCookie } from "@/lib/auth/session-cookie"

/**
 * Optimistic routing only (no data access). Visitors never sign in, so the
 * public pages are open to everyone; this only keeps the admin area behind
 * the minister's login. Real authorization is enforced by the API.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const signedIn = isAdminCookie(request.cookies.get(ROLE_COOKIE)?.value)

  if (pathname.startsWith("/admin") && !signedIn) {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname + search)
    return NextResponse.redirect(url)
  }
  if (pathname === "/login" && signedIn) {
    return NextResponse.redirect(new URL(ADMIN_HOME, request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
}
