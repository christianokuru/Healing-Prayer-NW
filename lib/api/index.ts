import { adapterApi } from "@/lib/api/adapter"

/**
 * The API adapter, chosen at build time with NEXT_PUBLIC_API_MODE:
 * - `mock` (default): demo data kept in this browser, no backend needed.
 * - `live`: the FastAPI backend, through this site's /api bridge (API_URL).
 */
export const API_MODE = process.env.NEXT_PUBLIC_API_MODE === "live" ? "live" : "mock"
export const isMockApi = API_MODE === "mock"

export const defaultApi = adapterApi

export type { Api } from "@/lib/api/contracts"
