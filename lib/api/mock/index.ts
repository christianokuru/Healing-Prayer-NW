import type { Api } from "@/lib/api/contracts"

import { mockAdminApi } from "./admin"
import { mockAuthApi } from "./auth"
import { mockPublicApi } from "./public"
import { mockStore } from "./store"

export { DEMO_ADMIN } from "./seed"

export const mockApi: Api = {
  auth: mockAuthApi,
  public: mockPublicApi,
  admin: mockAdminApi,
}

/** Mock-only: wipe local demo data and start fresh. */
export function resetMockData() {
  mockStore.reset()
}
