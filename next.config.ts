import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV !== "production"
const isLiveApi = process.env.NEXT_PUBLIC_API_MODE === "live"

/**
 * Everything is served from this site: fonts are self-hosted by next/font, photos go
 * through the image optimiser and the API through /api. Inline scripts and styles stay
 * allowed because pages are prerendered (no per-request nonce); the rest is locked down.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
]

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    // Free photos from Unsplash (Unsplash License), loaded from their CDN as Unsplash asks.
    // Only plain photo paths: no query strings, so the optimiser can't be pointed at other URLs.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-**", search: "" }],
  },
  turbopack: {
    // Live builds use the FastAPI adapter, so no demo data or demo logins are bundled.
    resolveAlias: isLiveApi ? { "@/lib/api/adapter": "./lib/api/adapter/live.ts" } : {},
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ]
  },
}

export default nextConfig
