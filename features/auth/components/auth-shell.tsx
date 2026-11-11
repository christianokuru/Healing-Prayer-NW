import type { ReactNode } from "react"

import { Logo } from "@/components/brand/logo"
import { CrisisNote } from "@/components/common/crisis-note"
import { MINISTRY, SCHEDULE } from "@/lib/config/ministry"

/** Split layout: calm brand panel on large screens, focused form on phones. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-primary-strong p-12 text-white lg:flex lg:flex-col">
        <svg
          aria-hidden="true"
          viewBox="0 0 600 600"
          className="pointer-events-none absolute -right-48 -bottom-40 size-[640px] opacity-[0.13]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          {[90, 150, 210, 270].map((r) => (
            <circle key={r} cx="300" cy="300" r={r} />
          ))}
        </svg>
        <Logo href="/login" tone="light" />
        <div className="relative mt-auto max-w-md">
          <p className="font-heading text-[40px] leading-[1.12] font-medium tracking-tight">
            A quiet place to be prayed for.
          </p>
          <p className="mt-5 text-[17px] leading-relaxed text-white/80">
            Free 30-minute prayer sessions with a small team of prayer ministers, every {SCHEDULE.weekdayName} evening
            at {MINISTRY.location.name} in Calgary.
          </p>
          <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-6 text-sm">
            <div>
              <dt className="text-white/65">When</dt>
              <dd className="mt-1 font-semibold">Thursdays</dd>
            </div>
            <div>
              <dt className="text-white/65">Time</dt>
              <dd className="mt-1 font-semibold">{SCHEDULE.hoursLabel}</dd>
            </div>
            <div>
              <dt className="text-white/65">Cost</dt>
              <dd className="mt-1 font-semibold">Always free</dd>
            </div>
          </dl>
        </div>
      </aside>

      <main id="main" className="flex flex-col px-5 pt-safe pb-safe sm:px-8">
        <div className="pt-6 lg:hidden">
          <Logo href="/login" />
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">{children}</div>
        <CrisisNote compact className="mx-auto mb-6 w-full max-w-[440px]" />
      </main>
    </div>
  )
}

export function AuthHeading({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="font-heading text-[34px] leading-[1.1] font-medium tracking-[-0.02em]">{title}</h1>
      {description && <p className="mt-2 text-base text-[#44564f]">{description}</p>}
    </div>
  )
}
