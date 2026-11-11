"use client"

import { cn } from "cn"
import { CalendarPlusIcon, MessageCircleWarningIcon, NavigationIcon, RepeatIcon, VideoIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { MINISTRY } from "@/lib/config/ministry"
import { canChangeThemselves, canSendLateNotice } from "@/lib/domain/booking-rules"
import type { Booking } from "@/lib/domain/types"
import { downloadText, sessionIcs } from "@/lib/files"

import { CancelBookingDialog, LateNoticeDialog } from "./session-dialogs"

interface SessionActionsProps {
  booking: Booking
  now: Date
  /** A pending request to move this booking already exists. */
  hasReschedulePending?: boolean
  variant?: "hero" | "card"
  className?: string
}

/**
 * Every action a visitor can take on one session. Which buttons appear is
 * decided by the booking rules, so the UI never offers something the API refuses.
 */
export function SessionActions({ booking, now, hasReschedulePending, variant = "card", className }: SessionActionsProps) {
  const [dialog, setDialog] = useState<"cancel" | "late" | null>(null)
  const hero = variant === "hero"
  const confirmed = booking.status === "confirmed"
  const online = booking.mode === "online"
  const canChange = canChangeThemselves(booking, now)
  const late = canSendLateNotice(booking, now)

  const primary = hero ? "inverse" : "outline"
  const quiet = hero ? "inverse-outline" : "ghost"

  const addToCalendar = () =>
    downloadText(
      "prayer-session.ics",
      sessionIcs({ id: booking.id, start: booking.slotStart, online, zoomLink: booking.zoomLink }),
      "text/calendar"
    )

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {confirmed && online && booking.zoomLink && (
        <Button
          nativeButton={false}
          render={<a href={booking.zoomLink} target="_blank" rel="noopener noreferrer" />}
          variant={hero ? "inverse" : "default"}
        >
          <VideoIcon aria-hidden="true" /> Join on Zoom
        </Button>
      )}
      {confirmed && (
        <Button variant={primary} onClick={addToCalendar}>
          <CalendarPlusIcon aria-hidden="true" /> Add to calendar
        </Button>
      )}
      {!online && (
        <Button
          nativeButton={false}
          render={<a href={MINISTRY.location.mapsUrl} target="_blank" rel="noopener noreferrer" />}
          variant={hero ? "inverse-outline" : "outline"}
        >
          <NavigationIcon aria-hidden="true" /> Directions
        </Button>
      )}
      <span className="hidden flex-1 sm:block" />
      {canChange && !hasReschedulePending && !booking.rescheduleOfId && (
        <Button
          nativeButton={false}
          render={<Link href={`/dashboard/book?reschedule=${booking.id}`} />}
          variant={quiet}
          className={hero ? "border-transparent" : ""}
        >
          <RepeatIcon aria-hidden="true" /> {booking.status === "pending" ? "Change time" : "Reschedule"}
        </Button>
      )}
      {canChange && (
        <Button variant={quiet} className={hero ? "border-transparent" : ""} onClick={() => setDialog("cancel")}>
          <XIcon aria-hidden="true" /> {booking.status === "pending" ? "Withdraw" : "Cancel"}
        </Button>
      )}
      {late && (
        <Button variant={quiet} className={hero ? "border-transparent" : ""} onClick={() => setDialog("late")}>
          <MessageCircleWarningIcon aria-hidden="true" /> Can&apos;t make it?
        </Button>
      )}

      <CancelBookingDialog booking={booking} open={dialog === "cancel"} onOpenChange={(o) => setDialog(o ? "cancel" : null)} />
      <LateNoticeDialog booking={booking} open={dialog === "late"} onOpenChange={(o) => setDialog(o ? "late" : null)} />
    </div>
  )
}
