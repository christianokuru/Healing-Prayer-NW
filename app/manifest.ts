import type { MetadataRoute } from "next"

import { MINISTRY } from "@/lib/config/ministry"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: MINISTRY.name,
    short_name: MINISTRY.shortName,
    description: "Book a free prayer session with Healing Prayer Northwest.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f6f4",
    theme_color: "#f3f6f4",
    categories: ["lifestyle", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Book a session", url: "/dashboard/book", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My sessions", url: "/dashboard/sessions", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  }
}
