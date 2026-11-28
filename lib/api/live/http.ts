import { ApiError } from "@/lib/api/errors"
import type { ApiErrorCode } from "@/lib/domain/types"

/** Same-origin bridge to FastAPI (see app/api/[...path]/route.ts). */
const BASE = "/api"

const KNOWN_CODES = new Set<ApiErrorCode>([
  "invalid_credentials",
  "invalid_token",
  "unauthenticated",
  "forbidden",
  "not_found",
  "slot_taken",
  "one_per_thursday",
  "outside_window",
  "date_unavailable",
  "too_late",
  "invalid_state",
  "validation",
  "rate_limited",
  "internal",
])

const OFFLINE_MESSAGE = "We couldn't connect. Please check your internet connection and try again."

/** The API sends `null` for empty fields; the UI's types use "not there". */
const dropNulls = (_key: string, value: unknown) => (value === null ? undefined : value)

export type Query = Record<string, string | number | undefined>

interface RequestOptions {
  body?: unknown
  query?: Query
  headers?: Record<string, string>
}

export interface RawResponse<T> {
  status: number
  headers: Headers
  data: T | undefined
}

function url(path: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") params.set(key, String(value))
  }
  const search = params.toString()
  return `${BASE}${path}${search ? `?${search}` : ""}`
}

async function toError(response: Response): Promise<ApiError> {
  try {
    const body = JSON.parse(await response.text()) as { code?: string; message?: string }
    const code = KNOWN_CODES.has(body.code as ApiErrorCode) ? (body.code as ApiErrorCode) : "internal"
    return new ApiError(code, body.message || "Something went wrong. Please try again.")
  } catch {
    return new ApiError("internal", "Something went wrong on our side. Please try again.")
  }
}

/** Every call goes through here, so errors always come back as `ApiError`. */
export async function raw<T>(method: string, path: string, options: RequestOptions = {}): Promise<RawResponse<T>> {
  const headers: Record<string, string> = { Accept: "application/json", ...options.headers }
  if (options.body !== undefined) headers["Content-Type"] = "application/json"

  let response: Response
  try {
    response = await fetch(url(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
      cache: "no-store",
    })
  } catch {
    throw new ApiError("internal", OFFLINE_MESSAGE)
  }

  if (response.status === 304 || response.status === 204) {
    return { status: response.status, headers: response.headers, data: undefined }
  }
  if (!response.ok) throw await toError(response)
  const text = await response.text()
  const data = text ? (JSON.parse(text, dropNulls) as T) : undefined
  return { status: response.status, headers: response.headers, data }
}

export async function request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
  return (await raw<T>(method, path, options)).data as T
}

/** A path segment from user data (IDs, tokens, dates). */
export const seg = (value: string) => encodeURIComponent(value)
