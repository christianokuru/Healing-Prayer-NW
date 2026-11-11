"use client"

import { cn } from "cn"
import { ChevronDownIcon } from "lucide-react"
import { useId, useState } from "react"

import { DateTile } from "@/components/common/date-tile"
import { StatusBadge } from "@/components/common/status-badge"
import { displayStatus } from "@/lib/domain/booking-rules"
import { fmt } from "@/lib/domain/time"
import { modeLabel, topicLabel } from "@/lib/domain/topics"
import type { Booking } from "@/lib/domain/types"

import { SessionActions } from "./session-actions"

interface SessionCardProps {
  booking: Booking
  now: Date
  hasReschedulePending?: boolean
  /** Show manage buttons (upcoming list). */
  actionable?: boolean
}

/** One session in a list, with its details tucked behind a disclosure. */
export function SessionCard({ booking, now, hasReschedulePending, actionable }: SessionCardProps) {
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  const status = displayStatus(booking, now)
  const tone = status === "pending" ? "warning" : status === "confirmed" ? "primary" : "neutral"

  return (
    <article className="rounded-[20px] border border-border bg-card p-4 md:p-5">
      <div className="flex items-start gap-4">
        <DateTile iso={booking.slotStart} tone={tone} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <h3 className="text-[17px] font-semibold">{fmt.dateLong(booking.slotStart)}</h3>
            <StatusBadge status={status} size="sm" />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {fmt.time(booking.slotStart)} · {modeLabel(booking.mode)}
            {booking.rescheduleOfId && status === "pending" ? " · Requested new time" : ""}
          </p>
          {booking.lateCancellation && (
            <p className="mt-1 text-sm text-muted-foreground">You let the prayer minister know you couldn&apos;t come.</p>
          )}
          {status === "declined" && (
            <p className="mt-2 rounded-xl bg-surface-muted px-3 py-2 text-sm text-[#3f524b]">
              {booking.declineMessage ?? "The prayer minister wasn't able to take this request. Please choose another Thursday."}
            </p>
          )}
          {hasReschedulePending && (
            <p className="mt-2 text-sm text-warning-foreground">
              You&apos;ve asked to move this session. It stays booked until the new time is approved.
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={detailsId}
        className="mt-3 flex h-10 items-center gap-1.5 rounded-lg text-sm font-semibold text-primary-strong hover:underline"
      >
        {open ? "Hide details" : "Show details"}
        <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <dl id={detailsId} className="mt-1 grid gap-3 rounded-2xl bg-surface-muted p-4 text-[15px] sm:grid-cols-[140px_1fr]">
          <dt className="text-muted-foreground">Topic</dt>
          <dd className="font-medium">{topicLabel(booking.topic)}</dd>
          <dt className="text-muted-foreground">Prayer points</dt>
          <dd className="whitespace-pre-line">{booking.prayerPoints}</dd>
          {booking.mode === "online" && (
            <>
              <dt className="text-muted-foreground">Zoom link</dt>
              <dd className="break-all">
                {booking.zoomLink ? (
                  <a href={booking.zoomLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-strong underline">
                    {booking.zoomLink}
                  </a>
                ) : (
                  "Sent once your request is approved."
                )}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Requested</dt>
          <dd>{fmt.dayMonthYear(booking.createdAt)}</dd>
        </dl>
      )}

      {actionable && (
        <SessionActions
          booking={booking}
          now={now}
          hasReschedulePending={hasReschedulePending}
          className="mt-4 border-t border-border pt-4"
        />
      )}
    </article>
  )
}
