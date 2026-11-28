"use client"

import { cn } from "cn"
import { HistoryIcon, InfoIcon, MailIcon, PhoneIcon, VideoIcon } from "lucide-react"
import Link from "next/link"

import { InitialsAvatar } from "@/components/common/initials-avatar"
import { ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { fmt, relativeDays } from "@/lib/domain/time"
import { modeLabel } from "@/lib/domain/labels"
import type { AdminBooking, PersonContact } from "@/lib/domain/types"

import { urgencyOf } from "../selectors"
import { DecisionButtons } from "./decision-buttons"

const URGENCY_TONE = { urgent: "danger", soon: "warning", later: "neutral" } as const

/** Tap to call or email: visitors have no dashboard, so this is how to reach them. */
export function ContactLinks({ person, className }: { person: PersonContact; className?: string }) {
  return (
    <p className={cn("flex flex-wrap gap-x-4 gap-y-1 text-sm", className)}>
      <a href={`tel:${person.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 font-medium text-primary-strong hover:underline">
        <PhoneIcon className="size-3.5" aria-hidden="true" />
        {person.phone}
      </a>
      <a href={`mailto:${person.email}`} className="inline-flex min-w-0 items-center gap-1.5 font-medium text-primary-strong hover:underline">
        <MailIcon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{person.email}</span>
      </a>
    </p>
  )
}

export function RequestCard({ booking, now }: { booking: AdminBooking; now: Date }) {
  const urgency = urgencyOf(booking.slotStart, now)
  const visits = booking.visitCount === 0 ? "First visit" : `${booking.visitCount} past ${booking.visitCount === 1 ? "visit" : "visits"}`
  return (
    <article className="rounded-[20px] border border-border bg-card p-4 md:p-5">
      <div className="flex items-start gap-3.5">
        <InitialsAvatar name={booking.visitor.fullName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] font-semibold">{booking.visitor.fullName}</h3>
            <ToneBadge tone={URGENCY_TONE[urgency]}>{relativeDays(booking.slotStart, now)}</ToneBadge>
            {booking.mode === "online" && (
              <ToneBadge tone="info" icon={VideoIcon}>
                {modeLabel(booking.mode)}
              </ToneBadge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-[#44564f]">
            {fmt.dateShort(booking.slotStart)} · {fmt.time(booking.slotStart)} · {visits}
          </p>
          <ContactLinks person={booking.visitor} className="mt-1.5" />
        </div>
      </div>

      <blockquote className="mt-3.5 rounded-2xl bg-[#f5f8f6] px-4 py-3 font-heading text-[17px] leading-relaxed text-[#26392f]">
        {booking.prayerPoints}
      </blockquote>

      {booking.mode === "online" && booking.onlineReason && (
        <p className="mt-2.5 flex items-start gap-2 text-sm text-info-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Asked for Zoom: {booking.onlineReason}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DecisionButtons booking={booking} />
        <Button
          nativeButton={false}
          render={<Link href={`/admin/history?person=${booking.visitor.id}`} />}
          variant="ghost"
        >
          <HistoryIcon aria-hidden="true" /> Their history
        </Button>
      </div>
    </article>
  )
}
