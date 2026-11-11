import type { ApiErrorCode, ApiErrorShape } from "@/lib/domain/types"

/** The one error type every API adapter throws (mock or live). */
export class ApiError extends Error implements ApiErrorShape {
  readonly code: ApiErrorCode

  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.name = "ApiError"
    this.code = code
  }
}

export const isApiError = (e: unknown): e is ApiError =>
  e instanceof ApiError ||
  (typeof e === "object" && e !== null && "code" in e && "message" in e)

/** Human message for any thrown value. */
export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (isApiError(e)) return e.message
  if (e instanceof Error && e.message) return e.message
  return fallback
}
