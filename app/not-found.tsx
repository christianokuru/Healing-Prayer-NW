import Link from "next/link"

import { LogoMark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="mb-6 size-14 rounded-2xl" />
      <h1 className="font-heading text-3xl font-medium">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-sm text-[17px] text-[#44564f]">The link may be old or mistyped.</p>
      <Button nativeButton={false} render={<Link href="/login" />} size="lg" className="mt-6">
        Go to the start
      </Button>
    </main>
  )
}
