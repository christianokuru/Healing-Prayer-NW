"use client"

import { CalendarPlusIcon, LinkIcon, NavigationIcon, VideoIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { EmptyState, ListSkeleton } from "@/components/common/feedback"
import { StatusBadge } from "@/components/common/status-badge"
import { Surface } from "@/components/common/surface"
import { Button } from "@/components/ui/button"
import { useNow } from "@/hooks/use-now"
import { MINISTRY, SCHEDULE } from "@/lib/config/ministry"
import { canChangeThemselves, canSendLateNotice, displayStatus, isUpcoming } from "@/lib/domain/booking-rules"
import { fmt } from "@/lib/domain/time"
import type { DisplayStatus, ManagedBooking } from "@/lib/domain/types"
import { downloadText, sessionIcs } from "@/lib/files"

import { SessionWhere } from "@/features/public/components/session-where"

import { useManagedBooking } from "../hooks"
import { CancelDialog, LateNoticeDialog } from "./manage-dialogs"

/** One plain sentence about where things stand, for each status. */
const STATUS_TEXT: Partial<Record<DisplayStatus, string>> = {
  pending: "The prayer minister is reviewing your request. We'll email you as soon as it's confirmed.",
  confirmed: "Your session is confirmed. We look forward to praying with you.",
  declined: "We're sorry, we couldn't offer you this time.",
  cancelled: "This booking has been cancelled.",
  cancelled_by_minister: "Sessions aren't running that Thursday, so this booking was cancelled. We're sorry.",
  completed: "This session has taken place. Thank you for coming.",
  no_show: "We missed you at this session. You're always welcome to book again.",
  expired: "This request wasn't confirmed before the session time.",
}

function Actions({ token, booking, now }: { token: string; booking: ManagedBooking; now: Date }) {
  const [dialog, setDialog] = useState<"cancel" | "late" | null>(null)
  const upcoming = isUpcoming(booking, now)
  const confirmed = booking.status === "confirmed"
  const canCancel = canChangeThemselves(booking, now)
  const canTellLate = canSendLateNotice(booking, now)

  if (!upcoming) {
    return (
      <Button nativeButton={false} render={<Link href="/book" />} size="lg" className="w-full sm:w-auto">
        Book another session
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
      {confirmed && booking.mode === "online" && booking.zoomLink && (
        <Button
          nativeButton={false}
          render={<a href={booking.zoomLink} target="_blank" rel="noopener noreferrer" />}
          size="lg"
        >
          <VideoIcon aria-hidden="true" /> Join on Zoom
        </Button>
      )}
      {confirmed && booking.mode === "in_person" && (
        <Button
          nativeButton={false}
          render={<a href={MINISTRY.location.mapsUrl} target="_blank" rel="noopener noreferrer" />}
          size="lg"
          variant="outline"
        >
          <NavigationIcon aria-hidden="true" /> Get directions
        </Button>
      )}
      <Button
        size="lg"
        variant="outline"
        onClick={() =>
          downloadText(
            "prayer-session.ics",
            sessionIcs({
              id: booking.id,
              start: booking.slotStart,
              online: booking.mode === "online",
              zoomLink: booking.zoomLink,
            }),
            "text/calendar"
          )
        }
      >
        <CalendarPlusIcon aria-hidden="true" /> Add to my calendar
      </Button>
      {canCancel && (
        <Button size="lg" variant="destructive-outline" onClick={() => setDialog("cancel")}>
          <XIcon aria-hidden="true" /> {booking.status === "pending" ? "Withdraw my request" : "Cancel my session"}
        </Button>
      )}
      {canTellLate && (
        <Button size="lg" variant="destructive-outline" onClick={() => setDialog("late")}>
          I can&apos;t make it
        </Button>
      )}
      <CancelDialog token={token} booking={booking} open={dialog === "cancel"} onOpenChange={(o) => setDialog(o ? "cancel" : null)} />
      <LateNoticeDialog token={token} booking={booking} open={dialog === "late"} onOpenChange={(o) => setDialog(o ? "late" : null)} />
    </div>
  )
}

/** The page behind the private link in every email: see, cancel, or say you can't come. */
export function ManageBooking({ token }: { token: string }) {
  const now = useNow()
  const query = useManagedBooking(token)

  if (query.isPending) return <ListSkeleton rows={2} />

  if (query.isError || !query.data) {
    return (
      <Surface>
        <EmptyState
          icon={LinkIcon}
          title="We couldn't open this booking"
          description={
            <>
              The link may be incomplete. Please open it again from your email, or contact us at{" "}
              <a href={`mailto:${MINISTRY.contactEmail}`} className="font-semibold text-primary-strong underline">
                {MINISTRY.contactEmail}
              </a>
              .
            </>
          }
          action={
            <Button nativeButton={false} render={<Link href="/book" />}>
              Book a session
            </Button>
          }
        />
      </Surface>
    )
  }

  const booking = query.data
  const status = displayStatus(booking, now)
  const firstName = booking.fullName.split(" ")[0]
  const lateCancelled = booking.status === "cancelled" && booking.lateCancellation

  return (
    <div className="mx-auto max-w-2xl animate-rise">
      <p className="text-base text-muted-foreground">Hello {firstName},</p>
      <h1 className="mt-1 font-heading text-[32px] leading-tight font-medium md:text-[38px]">Your prayer session</h1>

      <Surface className="mt-6 p-5 md:p-8">
        <StatusBadge status={status} />
        <p className="mt-4 font-heading text-[26px] leading-tight font-medium">{fmt.dateFull(booking.slotStart)}</p>
        <p className="mt-1 text-lg font-semibold tabular">
          {fmt.timeRange(booking.slotStart)} <span className="font-normal text-muted-foreground">(Calgary time)</span>
        </p>
        <SessionWhere mode={booking.mode} className="mt-4 flex items-start gap-2.5 text-base text-[#3f524b]" />

        <p className="mt-6 rounded-2xl bg-surface-muted px-4 py-3 text-base text-[#2c3f38]">
          {lateCancelled
            ? "Thank you for letting us know you can't come. The prayer minister has been told."
            : STATUS_TEXT[status]}
          {booking.status === "declined" && booking.declineMessage && (
            <span className="mt-2 block italic">“{booking.declineMessage}”</span>
          )}
        </p>

        <div className="mt-6 border-t border-border pt-6">
          <Actions token={token} booking={booking} now={now} />
          {isUpcoming(booking, now) && !canChangeThemselves(booking, now) && (
            <p className="mt-4 text-sm text-muted-foreground">
              Bookings can be cancelled here up to {SCHEDULE.changeNoticeHours} hours before. After that, please use
              “I can&apos;t make it” so the prayer minister knows.
            </p>
          )}
        </div>
      </Surface>

      <Surface className="mt-6">
        <h2 className="text-[17px] font-semibold">What you asked prayer for</h2>
        <p className="mt-2 font-heading text-[17px] leading-relaxed whitespace-pre-line text-[#2c3f38]">
          “{booking.prayerPoints}”
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Booked as {booking.fullName} · {booking.email}. Need to change something else? Email{" "}
          <a href={`mailto:${MINISTRY.contactEmail}`} className="font-semibold text-primary-strong underline">
            {MINISTRY.contactEmail}
          </a>
          .
        </p>
      </Surface>
    </div>
  )
}
