"use client"

import { cn } from "cn"
import { VideoIcon } from "lucide-react"

import { ADMIN_STATUS_LABEL, StatusBadge, ToneBadge } from "@/components/common/status-badge"
import { canMarkAttendance } from "@/lib/domain/booking-rules"
import { fmt } from "@/lib/domain/time"
import type { DisplayStatus } from "@/lib/domain/types"

import type { DaySlotRow } from "../selectors"
import { AttendanceControl } from "./attendance-control"
import { DecisionButtons } from "./decision-buttons"
import { ContactLinks } from "./request-card"

/** The four slots of one Thursday with whatever can be done on each. */
export function DaySchedule({ rows, now, detailed }: { rows: DaySlotRow[]; now: Date; detailed?: boolean }) {
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
              <StatusBadge status={state as DisplayStatus} label={ADMIN_STATUS_LABEL[state as DisplayStatus]} size="sm" />
            ) : (
              <ToneBadge tone="neutral">{state === "open" ? "Open" : "Closed"}</ToneBadge>
            )}
          </div>

          {booking && detailed && (
            <div className="mt-2 pl-0 sm:pl-[80px]">
              <p className="text-sm text-[#44564f]">“{booking.prayerPoints}”</p>
              <ContactLinks person={booking.visitor} className="mt-1.5" />
              {booking.mode === "online" && booking.onlineReason && (
                <p className="mt-1 text-sm text-info-foreground">Asked for Zoom: {booking.onlineReason}</p>
              )}
              {state === "pending" && <DecisionButtons booking={booking} size="sm" className="mt-3" />}
              {canMarkAttendance(booking, now) && <AttendanceControl booking={booking} className="mt-3" />}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
