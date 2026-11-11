import type { Api } from "@/lib/api/contracts"

import { mockAdminApi } from "./admin"
import { mockAuthApi } from "./auth"
import { mockStore } from "./store"
import { mockVisitorApi } from "./visitor"

export { DEMO_ACCOUNTS, MOCK_VERIFICATION_CODE } from "./seed"

export const mockApi: Api = {
  auth: mockAuthApi,
  visitor: mockVisitorApi,
  admin: mockAdminApi,
}

/** Mock-only: wipe local demo data and start fresh. */
export function resetMockData() {
  mockStore.reset()
}
