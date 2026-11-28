import type { Api } from "@/lib/api/contracts"
import { liveApi } from "@/lib/api/live"

import type { DemoTools } from "./types"

/** Live mode: FastAPI through /api. No demo code is bundled. */
export const adapterApi: Api = liveApi
export const demoTools: DemoTools | null = null
