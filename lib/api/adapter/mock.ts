import type { Api } from "@/lib/api/contracts"
import { DEMO_ADMIN, mockApi, resetMockData } from "@/lib/api/mock"

import type { DemoTools } from "./types"

/** Demo mode: the browser mock, plus its demo login and reset. */
export const adapterApi: Api = mockApi
export const demoTools: DemoTools | null = { admin: DEMO_ADMIN, reset: resetMockData }
