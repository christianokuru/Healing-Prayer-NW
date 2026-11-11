import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    // Run in a zone far from Calgary to prove times never depend on the device.
    env: { TZ: "Asia/Tokyo" },
  },
})
