import type { Metadata, Viewport } from "next"
import { Inter, Newsreader } from "next/font/google"

import { AppProviders } from "@/components/providers/app-providers"
import { MINISTRY } from "@/lib/config/ministry"

import "lenis/dist/lenis.css"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
})

export const metadata: Metadata = {
  title: {
    default: MINISTRY.name,
    template: `%s · ${MINISTRY.name}`,
  },
  description:
    "Book a free, 30-minute prayer session with the Healing Prayer Northwest prayer ministry in Calgary.",
  applicationName: MINISTRY.name,
  appleWebApp: {
    capable: true,
    title: MINISTRY.shortName,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f6f4",
  colorScheme: "light",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={`${inter.variable} ${newsreader.variable} h-full`}>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
