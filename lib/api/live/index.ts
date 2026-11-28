import type { Api } from "@/lib/api/contracts"

import { liveAdminApi } from "./admin"
import { liveAuthApi } from "./auth"
import { livePublicApi } from "./public"

/** Talks to the FastAPI backend through this site's /api bridge. */
export const liveApi: Api = {
  auth: liveAuthApi,
  public: livePublicApi,
  admin: liveAdminApi,
}
