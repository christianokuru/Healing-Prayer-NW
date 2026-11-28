/**
 * The adapter for this build. next.config.ts points this import at `live.ts`
 * when NEXT_PUBLIC_API_MODE=live, so demo data and logins never reach those
 * builds. Tests and type checks use the mock.
 */
export { adapterApi, demoTools } from "./mock"
