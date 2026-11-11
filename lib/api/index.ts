import type { Api } from "@/lib/api/contracts"
import { mockApi } from "@/lib/api/mock"

/**
 * Picks the API adapter. Today only `mock` exists; when the FastAPI
 * backend is ready, add `lib/api/live` (calling Next.js route handlers that
 * forward the session cookie) and switch with NEXT_PUBLIC_API_MODE=live.
 */
export const API_MODE = process.env.NEXT_PUBLIC_API_MODE ?? "mock"
export const isMockApi = API_MODE === "mock"

export const defaultApi: Api = mockApi

export type { Api } from "@/lib/api/contracts"
