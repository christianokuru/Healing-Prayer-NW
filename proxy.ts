import { NextResponse, type NextRequest } from "next/server"

import { ROLE_COOKIE, homeFor, isRole } from "@/lib/auth/session-cookie"

/**
 * Optimistic routing only (no data access): sends signed-out people to
 * /login and keeps each role in its own area before anything renders.
 * Real authorization is enforced by the API on every request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const role = request.cookies.get(ROLE_COOKIE)?.value
  const signedIn = isRole(role)

  const isVisitorArea = pathname.startsWith("/dashboard")
  const isAdminArea = pathname.startsWith("/admin")
  const isAuthPage = pathname === "/login" || pathname === "/signup"

  if ((isVisitorArea || isAdminArea) && !signedIn) {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname + search)
    return NextResponse.redirect(url)
  }
  if (signedIn) {
    if ((isAdminArea && role !== "admin") || (isVisitorArea && role !== "visitor") || isAuthPage) {
      return NextResponse.redirect(new URL(homeFor(role), request.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/signup"],
}
