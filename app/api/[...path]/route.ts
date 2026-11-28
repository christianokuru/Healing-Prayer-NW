import type { NextRequest } from "next/server"

/**
 * Same-origin bridge to the FastAPI backend ("backend for frontend").
 *
 * The browser only ever talks to this site, so the session cookie stays
 * first-party and no CORS is needed. This handler forwards the request with
 * the visitor's IP (for the API's rate limits) and only the headers the API
 * needs, and passes back only the headers the browser needs.
 */

const API_URL = (process.env.API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "")

/** The FastAPI session cookie (its COOKIE_NAME). Nothing else is forwarded. */
const SESSION_COOKIE = process.env.API_SESSION_COOKIE ?? "hpn_session"

/** Only the API's own areas; /docs, /openapi.json and anything else stay private. */
const ALLOWED_ROOTS = new Set(["auth", "availability", "bookings", "manage", "admin"])

/** The API refuses more than 64 KB too; checking here saves the trip. */
const MAX_BODY_BYTES = 64 * 1024
const TIMEOUT_MS = 15_000

const REQUEST_HEADERS = ["content-type", "origin", "sec-fetch-site", "if-none-match", "user-agent"]
const RESPONSE_HEADERS = ["content-type", "etag", "cache-control", "retry-after"]

function problem(status: number, code: string, message: string) {
  return Response.json({ code, message }, { status, headers: { "Cache-Control": "no-store" } })
}

/**
 * The visitor's IP. The nearest proxy (Vercel, or Caddy/nginx on the VPS) sets
 * X-Forwarded-For; its last entry is the one that proxy saw, so a value the
 * visitor typed in themselves can't take its place.
 */
function clientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")
  const last = forwarded?.split(",").at(-1)?.trim()
  return last || request.headers.get("x-real-ip")?.trim() || undefined
}

/** Reads the body, but stops (returns null) as soon as it passes `limit` bytes. */
async function readCapped(request: NextRequest, limit: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!request.body) return new Uint8Array(0)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const out = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

async function forward(request: NextRequest, ctx: RouteContext<"/api/[...path]">) {
  const { path } = await ctx.params
  if (!path.length || !ALLOWED_ROOTS.has(path[0])) {
    return problem(404, "not_found", "We couldn't find that.")
  }
  // Re-encode each segment so nothing can climb out of the API's paths.
  const target = `${API_URL}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`

  const headers = new Headers()
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  const session = request.cookies.get(SESSION_COOKIE)?.value
  if (session) headers.set("cookie", `${SESSION_COOKIE}=${session}`)
  const ip = clientIp(request)
  if (ip) headers.set("x-forwarded-for", ip)

  let body: Uint8Array<ArrayBuffer> | undefined
  if (request.method !== "GET" && request.method !== "HEAD") {
    const declared = Number(request.headers.get("content-length") ?? 0)
    const read = declared > MAX_BODY_BYTES ? null : await readCapped(request, MAX_BODY_BYTES)
    if (!read) return problem(413, "validation", "That's too much text to send at once.")
    body = read
  }

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    return problem(503, "internal", "We can't reach the booking service right now. Please try again in a minute.")
  }

  const out = new Headers({ "Cache-Control": "no-store" })
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) out.set(name, value)
  }
  for (const cookie of upstream.headers.getSetCookie()) out.append("set-cookie", cookie)

  const empty = upstream.status === 204 || upstream.status === 304
  return new Response(empty ? null : upstream.body, { status: upstream.status, headers: out })
}

export const GET = forward
export const POST = forward
export const PUT = forward
export const PATCH = forward
export const DELETE = forward
