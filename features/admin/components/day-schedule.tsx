"use client"

import { cn } from "cn"
import { UndoIcon, UserXIcon, VideoIcon } from "lucide-react"
import { toast } from "sonner"

import { StatusBadge, ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/api/errors"
import { canMarkNoShow } from "@/lib/domain/booking-rules"
import { fmt } from "@/lib/domain/time"
import { topicLabel } from "@/lib/domain/topics"
import type { DisplayStatus } from "@/lib/domain/types"

import { useMarkNoShow, useUndoNoShow } from "../hooks"
import type { DaySlotRow } from "../selectors"
import { DecisionButtons } from "./decision-buttons"

const ADMIN_LABELS: Partial<Record<string, string>> = {
  pending: "Waiting",
  no_show: "No-show",
  cancelled_by_minister: "Cancelled",
}

/** The four slots of one Thursday with whatever can be done on each. */
export function DaySchedule({ rows, now, detailed }: { rows: DaySlotRow[]; now: Date; detailed?: boolean }) {
  const markNoShow = useMarkNoShow()
  const undoNoShow = useUndoNoShow()

  const onNoShow = (id: string, name: string) =>
    markNoShow.mutateAsync(id).then(
      () =>
        toast.success(`${name} marked as a no-show. They'll get a gentle email to rebook.`, {
          action: { label: "Undo", onClick: () => undoNoShow.mutate(id) },
        }),
      (e) => toast.error(errorMessage(e))
    )

  return (
    <ul className="divide-y divide-border">
      {rows.map(({ start, booking, state }) => (
        <li key={start} className="py-3.5 first:pt-1 last:pb-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="w-[68px] shrink-0 font-semibold tabular">{fmt.time(start)}</span>
            <span className={cn("min-w-0 flex-1", booking ? "font-medium" : "text-muted-foreground italic")}>
              {booking ? booking.visitor.fullName : state === "open" ? "No booking yet" : "Not booked"}
              {booking?.mode === "online" && (
                <VideoIcon className="ml-1.5 inline size-4 text-info" aria-label="Online by Zoom" />
              )}
            </span>
            {booking ? (
              <StatusBadge status={state as DisplayStatus} label={ADMIN_LABELS[state]} size="sm" />
            ) : (
              <ToneBadge tone="neutral">{state === "open" ? "Open" : "Closed"}</ToneBadge>
            )}
          </div>

          {booking && detailed && (
            <div className="mt-2 pl-0 sm:pl-[80px]">
              <p className="text-sm text-[#44564f]">
                <span className="font-medium">{topicLabel(booking.topic)}:</span> “{booking.prayerPoints}”
              </p>
              {booking.mode === "online" && booking.onlineReason && (
                <p className="mt-1 text-sm text-info-foreground">Asked for Zoom: {booking.onlineReason}</p>
              )}
              {state === "pending" && <DecisionButtons booking={booking} size="sm" className="mt-3" />}
              {canMarkNoShow(booking, now) && state === "completed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 mt-1"
                  onClick={() => onNoShow(booking.id, booking.visitor.fullName.split(" ")[0])}
                >
                  <UserXIcon aria-hidden="true" /> Mark as no-show
                </Button>
              )}
              {state === "no_show" && (
                <Button variant="ghost" size="sm" className="-ml-3 mt-1" onClick={() => undoNoShow.mutate(booking.id)}>
                  <UndoIcon aria-hidden="true" /> They did come
                </Button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
