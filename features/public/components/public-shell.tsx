import { cn } from "cn"
import Link from "next/link"
import type { ReactNode } from "react"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { MINISTRY, SCHEDULE } from "@/lib/config/ministry"

const NAV = [
  { href: "/#expect", label: "What to expect" },
  { href: "/#visit", label: "Where we meet" },
  { href: "/privacy", label: "Privacy" },
]

/** Centred page width for public pages; the home page uses full-width bands instead. */
export function PublicContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 pt-6 pb-14 md:px-8 md:pt-10", className)}>{children}</div>
}

/** Layout for everything a visitor sees. No sign-in, large text, one clear invitation. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <header className="sticky top-0 z-30 border-b border-sand bg-cream/90 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:h-[76px] md:px-8">
          <Logo href="/" />
          <nav aria-label="Main" className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hidden h-11 items-center rounded-xl px-3.5 text-[15px] font-medium text-[#3f524b] transition-colors hover:bg-sand lg:flex"
              >
                {item.label}
              </Link>
            ))}
            <Button
              nativeButton={false}
              render={<Link href="/book" />}
              className="ml-2 bg-rose text-white hover:bg-rose-strong"
            >
              <span className="sm:hidden">Book</span>
              <span className="hidden sm:inline">Book a session</span>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-sand bg-[#f7f0e6] pb-safe">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.3fr_1fr_1fr] md:px-8">
          <div>
            <Logo href="/" />
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[#44564f]">
              Free healing prayer every {SCHEDULE.weekdayName} evening at {MINISTRY.location.name}, Calgary. All are
              welcome.
            </p>
          </div>
          <div className="text-[15px] text-[#44564f]">
            <h2 className="mb-3 font-heading text-lg font-medium text-foreground">Visit</h2>
            <p>
              {MINISTRY.location.name}
              <br />
              {MINISTRY.location.street}
              <br />
              {MINISTRY.location.city}
            </p>
            <p className="mt-2">
              {SCHEDULE.weekdayName}s, {SCHEDULE.hoursLabel}
            </p>
          </div>
          <div className="text-[15px] text-[#44564f]">
            <h2 className="mb-3 font-heading text-lg font-medium text-foreground">Get in touch</h2>
            <a href={`mailto:${MINISTRY.contactEmail}`} className="font-semibold text-primary-strong underline">
              {MINISTRY.contactEmail}
            </a>
            <nav aria-label="Footer" className="mt-4 flex flex-col gap-2">
              <Link href="/book" className="font-semibold text-rose-strong hover:underline">
                Book a prayer session
              </Link>
              <Link href="/privacy" className="hover:underline">
                Privacy notice
              </Link>
              <Link href="/login" className="text-muted-foreground hover:underline">
                Prayer minister login
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
