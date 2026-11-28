"use client"

import { CheckCheckIcon, ClipboardCheckIcon, VideoIcon } from "lucide-react"

import { Surface } from "@/components/common/surface"
import { Button } from "@/components/ui/button"
import { fmt, keyLabel, relativeDays } from "@/lib/domain/time"

import type { AttendanceDay } from "../selectors"
import { AttendanceControl, useAttendanceActions } from "./attendance-control"

/**
 * Overview card: approved sessions that have started but have no attendance
 * yet, plus anyone marked "didn't come" recently, so the minister can email
 * them. This is where "came / didn't come" (and so no-shows) comes from.
 */
export function AttendanceCard({ days, now }: { days: AttendanceDay[]; now: Date }) {
  const { markAllCame } = useAttendanceActions()
  const all = days.flatMap((d) => d.bookings)
  if (!all.length) return null
  const toMark = all.filter((b) => b.status === "confirmed").length
  const missed = all.length - toMark
  const summary = [
    toMark && `${toMark === 1 ? "1 person" : `${toMark} people`} to mark. Tap who came and who didn't.`,
    missed && `${missed === 1 ? "1 person" : `${missed} people`} didn't come recently. You can email them to check in.`,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <Surface aria-labelledby="attendance-title" className="border-warning/50">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning-foreground">
          <ClipboardCheckIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 id="attendance-title" className="font-heading text-[22px] leading-tight font-medium">
            Mark attendance
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {days.map((day) => {
          const unmarked = day.bookings.filter((b) => b.status === "confirmed")
          return (
          <div key={day.date}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#3f524b]">
                {keyLabel(day.date)}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {relativeDays(day.bookings[0].slotStart, now)}
                </span>
              </p>
              {unmarked.length > 1 && (
                <Button variant="ghost" size="sm" className="-mr-2 shrink-0" onClick={() => markAllCame(unmarked)}>
                  <CheckCheckIcon aria-hidden="true" /> Everyone came
                </Button>
              )}
            </div>
            <ul className="divide-y divide-border">
              {day.bookings.map((b) => (
                <li key={b.id} className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {b.visitor.fullName}
                      {b.mode === "online" && (
                        <VideoIcon className="ml-1.5 inline size-4 text-info" aria-label="Online by Zoom" />
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground tabular">{fmt.time(b.slotStart)}</p>
                  </div>
                  <AttendanceControl booking={b} />
                </li>
              ))}
            </ul>
          </div>
          )
        })}
      </div>
    </Surface>
  )
}
