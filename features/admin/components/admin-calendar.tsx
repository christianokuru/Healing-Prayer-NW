"use client"

import { cn } from "cn"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useMemo, useRef, useState } from "react"

import { ErrorState } from "@/components/common/feedback"
import { PageHeader } from "@/components/common/page-header"
import { Surface } from "@/components/common/surface"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useNow } from "@/hooks/use-now"
import { useScrollTo } from "@/hooks/use-scroll-to"
import { SCHEDULE } from "@/lib/config/ministry"
import { isActive } from "@/lib/domain/booking-rules"
import { dateKey, keyLabel, monthKey, relativeDays, slotStartIso } from "@/lib/domain/time"

import { buildMonth, monthLabel, shiftMonth, type CalendarCell } from "../calendar-model"
import { useAdminBookings, useBlockedDates } from "../hooks"
import { currentSessionDay, type SlotRowState } from "../selectors"
import { BlockDayControls } from "./block-day-controls"
import { DaySchedule } from "./day-schedule"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const DOT: Record<string, string> = {
  confirmed: "bg-primary",
  pending: "bg-warning",
  completed: "bg-info",
  no_show: "bg-[#b4433a]",
  open: "border-2 border-[#9db0a8] bg-card",
}
const dotClass = (s: SlotRowState) => DOT[s] ?? "bg-[#dce4e0]"

const LEGEND: [string, string][] = [
  ["Confirmed", DOT.confirmed],
  ["Waiting", DOT.pending],
  ["Open", DOT.open],
  ["Completed", DOT.completed],
  ["No-show", DOT.no_show],
]

function cellSummary(c: CalendarCell) {
  if (c.blocked) return { text: "Cancelled", tone: "text-danger-foreground" }
  if (c.past) return { text: c.booked ? `${c.booked} held` : "No sessions", tone: "text-[#3f524b]" }
  if (c.pending) return { text: `${c.booked}/4 · ${c.pending} waiting`, tone: "text-warning-foreground" }
  return { text: `${c.booked} of 4 booked`, tone: "text-[#3f524b]" }
}

export function AdminCalendar() {
  const now = useNow()
  const bookings = useAdminBookings()
  const blocked = useBlockedDates()
  const [month, setMonth] = useState(() => monthKey(now))
  const [selected, setSelected] = useState(() => currentSessionDay(now))
  const panelRef = useRef<HTMLElement>(null)
  const scrollTo = useScrollTo(-88)
  const wide = useMediaQuery("(min-width: 1024px)")

  const all = useMemo(() => bookings.data ?? [], [bookings.data])
  const blockedList = useMemo(() => blocked.data ?? [], [blocked.data])
  const cells = useMemo(() => buildMonth(month, all, blockedList, now), [month, all, blockedList, now])

  const firstMonth = all.length ? monthKey(all[0].slotStart) : monthKey(now)
  const lastMonth = shiftMonth(monthKey(now), 2)

  const selectedCell =
    cells.find((c) => c.key === selected) ?? buildMonth(selected.slice(0, 7), all, blockedList, now).find((c) => c.key === selected)
  const isPast = selected < dateKey(now)
  const affected = selectedCell?.rows?.filter((r) => r.booking && isActive(r.booking)).length ?? 0
  const loading = bookings.isPending || blocked.isPending

  const pick = (c: CalendarCell) => {
    setSelected(c.key)
    if (!c.inMonth) setMonth(c.key.slice(0, 7))
    if (!wide) requestAnimationFrame(() => scrollTo(panelRef.current))
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="Calendar"
        description="Tap a Thursday to see its sessions, approve requests or mark it as unavailable."
      />
      {bookings.isError && <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Surface className="p-3 sm:p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous month"
              disabled={month <= firstMonth}
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
            >
              <ChevronLeftIcon />
            </Button>
            <h2 className="text-lg font-semibold" aria-live="polite">
              {monthLabel(month)}
            </h2>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              disabled={month >= lastMonth}
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
            >
              <ChevronRightIcon />
            </Button>
          </div>

          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#3f524b]">
            {LEGEND.map(([label, cls]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-full", cls)} aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="grid" aria-label={monthLabel(month)}>
            {WEEKDAYS.map((d, i) => (
              <div
                key={d}
                role="columnheader"
                className={cn(
                  "py-1.5 text-center text-[11px] font-semibold tracking-wide uppercase sm:text-xs",
                  i === SCHEDULE.weekday ? "text-primary-strong" : "text-muted-foreground"
                )}
              >
                <span className="sm:hidden">{d[0]}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
            {loading
              ? Array.from({ length: 35 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl sm:h-24" />)
              : cells.map((c) =>
                  c.isSessionDay ? (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => pick(c)}
                      aria-pressed={selected === c.key}
                      aria-label={`${keyLabel(c.key)}: ${cellSummary(c).text}`}
                      className={cn(
                        "flex min-h-14 flex-col items-center gap-1 rounded-xl border p-1.5 text-left transition-[border-color,box-shadow] sm:min-h-24 sm:items-start sm:p-2",
                        selected === c.key
                          ? "border-2 border-primary bg-primary-soft"
                          : c.blocked
                            ? "border-[#e3c2be] bg-[repeating-linear-gradient(135deg,#f7f0ef_0_6px,#fff_6px_12px)]"
                            : "border-input bg-card hover:border-primary hover:shadow-[0_4px_14px_rgba(18,35,30,0.08)]",
                        !c.inMonth && "opacity-50",
                        c.isToday && selected !== c.key && "ring-2 ring-info"
                      )}
                    >
                      <span className="text-sm font-bold sm:text-[15px]">{c.day}</span>
                      {!c.blocked && c.rows && (
                        <span className="mt-auto flex gap-[3px] sm:gap-1" aria-hidden="true">
                          {c.rows.map((r) => (
                            <span key={r.start} className={cn("size-1.5 rounded-full sm:size-2.5", dotClass(r.state))} />
                          ))}
                        </span>
                      )}
                      {c.blocked && (
                        <span className="mt-auto text-[10px] font-bold text-danger-foreground sm:hidden" aria-hidden="true">
                          OFF
                        </span>
                      )}
                      <span className={cn("hidden text-xs leading-tight font-semibold sm:block", cellSummary(c).tone)}>
                        {cellSummary(c).text}
                      </span>
                    </button>
                  ) : (
                    <div
                      key={c.key}
                      className={cn(
                        "flex min-h-14 justify-center rounded-xl p-1.5 text-xs text-[#6a7c75] sm:min-h-24 sm:justify-start sm:p-2 sm:text-[13px]",
                        !c.inMonth && "opacity-40",
                        c.isToday && "font-bold text-info-foreground ring-2 ring-info"
                      )}
                    >
                      {c.day}
                    </div>
                  )
                )}
          </div>
        </Surface>

        <section ref={panelRef} aria-label="Selected Thursday" className="scroll-mt-24">
          <Surface className="lg:sticky lg:top-6">
            <p className="text-[13px] font-medium text-muted-foreground">
              {relativeDays(slotStartIso(selected, SCHEDULE.slotTimes[0]), now)}
            </p>
            <h2 className="mt-0.5 font-heading text-[26px] leading-tight font-medium">{keyLabel(selected)}</h2>
            <p className="mt-1 mb-3 text-sm text-[#44564f]">
              {selectedCell?.blocked
                ? "Cancelled by you"
                : isPast
                  ? "Sessions from this evening"
                  : `${affected} of 4 sessions booked · ${SCHEDULE.hoursLabel}`}
            </p>
            {loading || !selectedCell?.rows ? (
              <Skeleton className="h-48 rounded-xl" />
            ) : (
              <>
                {!selectedCell.blocked && <DaySchedule rows={selectedCell.rows} now={now} detailed />}
                {!isPast && (
                  <div className="mt-4 border-t border-border pt-4">
                    <BlockDayControls date={selected} blocked={selectedCell.blocked} affected={affected} />
                  </div>
                )}
              </>
            )}
          </Surface>
        </section>
      </div>
    </div>
  )
}
