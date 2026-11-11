import type { Metadata } from "next"

import { LogoMark } from "@/components/brand/logo"

export const metadata: Metadata = { title: "You're offline" }

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="mb-6 size-14 rounded-2xl" />
      <h1 className="font-heading text-3xl font-medium">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-[17px] text-[#44564f]">
        Please check your internet connection. Your bookings are safe and will be here when you&apos;re back online.
      </p>
    </main>
  )
}
