"use client"

import { StatusBadge } from "@/components/common/status-badge"
import { fmt, relativeDays } from "@/lib/domain/time"
import type { Booking } from "@/lib/domain/types"

import { SessionActions } from "./session-actions"
import { SessionWhere } from "./session-meta"

/** The hero card: the one thing a returning visitor most wants to see. */
export function NextSessionCard({
  booking,
  now,
  hasReschedulePending,
}: {
  booking: Booking
  now: Date
  hasReschedulePending?: boolean
}) {
  const pending = booking.status === "pending"
  return (
    <section
      aria-label="Your next session"
      className="relative isolate overflow-hidden rounded-[24px] bg-primary-strong p-6 text-white shadow-[0_18px_40px_-20px_rgba(18,73,59,0.6)] md:p-8"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 320 320"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="pointer-events-none absolute -top-24 -right-20 -z-10 size-80 opacity-[0.14]"
      >
        <circle cx="160" cy="160" r="70" />
        <circle cx="160" cy="160" r="105" />
        <circle cx="160" cy="160" r="140" />
      </svg>
      <div className="flex flex-wrap items-center gap-2.5">
        <StatusBadge
          status={booking.status}
          className={pending ? "bg-warning-soft text-warning-foreground" : "bg-white text-primary-strong"}
        />
        <span className="text-sm text-white/85">
          {pending ? "Your request" : "Your next prayer session"} · {relativeDays(booking.slotStart, now).toLowerCase()}
        </span>
      </div>
      <h2 className="mt-5 font-heading text-[30px] leading-[1.1] font-medium tracking-tight md:text-[38px]">
        {fmt.dateLong(booking.slotStart)}
      </h2>
      <p className="mt-2 text-lg text-white/92">
        {fmt.timeRange(booking.slotStart)} <span className="text-white/70">(Calgary time)</span>
      </p>
      <SessionWhere mode={booking.mode} className="mt-5 flex items-start gap-2.5 text-[15px] text-white/90" />
      {pending && (
        <p className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-[15px] text-white/90">
          The prayer minister will review your request soon. We&apos;ll email you once it&apos;s confirmed. Please wait for
          confirmation before coming.
        </p>
      )}
      {hasReschedulePending && (
        <p className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-[15px] text-white/90">
          You&apos;ve asked to move this session. It stays booked until the new time is approved.
        </p>
      )}
      <SessionActions
        booking={booking}
        now={now}
        hasReschedulePending={hasReschedulePending}
        variant="hero"
        className="mt-6"
      />
    </section>
  )
}
