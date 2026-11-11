"use client"

import { cn } from "cn"
import { CalendarDaysIcon, CalendarOffIcon, PartyPopperIcon } from "lucide-react"
import Link from "next/link"

import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/feedback"
import { PageHeader } from "@/components/common/page-header"
import { StatTile } from "@/components/common/stat-tile"
import { Surface, SurfaceHeader } from "@/components/common/surface"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@/features/auth/hooks"
import { useNow } from "@/hooks/use-now"
import { SCHEDULE } from "@/lib/config/ministry"
import { displayStatus, isActive } from "@/lib/domain/booking-rules"
import { HOUR_MS, dateKey, fmt, greetingFor, keyLabel, monthKey, relativeDays, sessionDaysBetween, slotStartIso } from "@/lib/domain/time"
import type { AdminBooking, BlockedDate } from "@/lib/domain/types"

import { useAdminBookings, useBlockedDates } from "../hooks"
import { bookingsOnDay, currentSessionDay, daySlots, pendingRequests, urgencyOf } from "../selectors"
import { DaySchedule } from "./day-schedule"
import { RequestCard } from "./request-card"

function monthStats(bookings: AdminBooking[], blocked: BlockedDate[], now: Date) {
  const month = monthKey(now)
  const [y, m] = month.split("-").map(Number)
  const blockedKeys = new Set(blocked.map((b) => b.date))
  const days = sessionDaysBetween(new Date(y, m - 1, 1, 12), new Date(y, m, 0, 12)).filter((k) => !blockedKeys.has(k))
  const count = bookings.filter(
    (b) => monthKey(b.slotStart) === month && (isActive(b) || b.status === "no_show")
  ).length
  return { count, capacity: days.length * SCHEDULE.slotTimes.length }
}

function attendance(bookings: AdminBooking[], now: Date) {
  const since = now.getTime() - 90 * 24 * HOUR_MS
  const recent = bookings.filter((b) => new Date(b.slotStart).getTime() >= since && new Date(b.slotStart) <= now)
  const done = recent.filter((b) => displayStatus(b, now) === "completed").length
  const missed = recent.filter((b) => b.status === "no_show").length
  return { rate: done + missed ? Math.round((done / (done + missed)) * 100) : 100, missed }
}

export function AdminOverview() {
  const user = useUser()
  const now = useNow()
  const bookings = useAdminBookings()
  const blocked = useBlockedDates()

  const all = bookings.data ?? []
  const pending = pendingRequests(all, now)
  const urgent = pending.filter((b) => urgencyOf(b.slotStart, now) === "urgent").length
  const today = currentSessionDay(now)
  const isBlocked = !!blocked.data?.some((b) => b.date === today)
  const rows = daySlots(today, bookingsOnDay(all, today), now, isBlocked)
  const bookedToday = rows.filter((r) => r.booking && isActive(r.booking)).length
  const month = monthStats(all, blocked.data ?? [], now)
  const att = attendance(all, now)
  const upcomingBlocked = (blocked.data ?? []).filter((b) => slotStartIso(b.date, SCHEDULE.slotTimes[0]) > now.toISOString())
  const firstName = user.fullName.split(" ")[0]

  const subtitle = bookings.data
    ? pending.length === 0
      ? "You're all caught up. Every request has been answered."
      : `${pending.length} ${pending.length === 1 ? "request is" : "requests are"} waiting for you${urgent ? `, and ${urgent} ${urgent === 1 ? "is" : "are"} within 48 hours.` : "."}`
    : "Loading today's overview…"

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow={fmt.dateFull(now)}
        title={`${greetingFor(now)}, ${firstName}`}
        description={subtitle}
        actions={
          <Button nativeButton={false} render={<Link href="/admin/calendar" />} variant="outline">
            <CalendarDaysIcon aria-hidden="true" /> Open calendar
          </Button>
        }
      />

      {bookings.isError && <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />}

      <div className="mb-7 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {bookings.isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[124px] rounded-2xl" />)
        ) : (
          <>
            <StatTile
              label={`${relativeDays(slotStartIso(today, "19:00"), now)} · ${fmt.dayMonth(slotStartIso(today, "19:00"))}`}
              value={isBlocked ? "–" : bookedToday}
              unit={isBlocked ? "cancelled" : `of ${SCHEDULE.slotTimes.length} booked`}
              footer={
                <span className="flex gap-1" aria-hidden="true">
                  {rows.map((r) => (
                    <span
                      key={r.start}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        r.state === "confirmed" ? "bg-primary" : r.state === "pending" ? "bg-warning" : "bg-[#dce4e0]"
                      )}
                    />
                  ))}
                </span>
              }
            />
            <StatTile
              label="Waiting for you"
              value={pending.length}
              unit={pending.length === 1 ? "request" : "requests"}
              footer={
                <span className={cn("font-semibold", urgent ? "text-warning-foreground" : "text-muted-foreground")}>
                  {urgent ? `${urgent} within 48 hours` : pending.length ? "None are urgent" : "All caught up"}
                </span>
              }
            />
            <StatTile
              label={`Sessions in ${fmt.monthYear(now).split(" ")[0]}`}
              value={month.count}
              unit={`of ${month.capacity} slots`}
              footer={
                <span className="block h-1.5 overflow-hidden rounded-full bg-[#e3eae6]">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${month.capacity ? Math.min(100, (month.count / month.capacity) * 100) : 0}%` }}
                  />
                </span>
              }
            />
            <StatTile
              label="Attendance · 90 days"
              value={`${att.rate}%`}
              unit="showed up"
              footer={<span className="text-muted-foreground">{att.missed} no-shows</span>}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Needs your attention" className="flex min-w-0 flex-col gap-3">
          <h2 className="font-heading text-[24px] font-medium md:text-[26px]">Needs your attention</h2>
          {bookings.isPending && <ListSkeleton rows={3} />}
          {bookings.data && pending.length === 0 && (
            <Surface>
              <EmptyState
                icon={PartyPopperIcon}
                title="No requests waiting"
                description="New requests will appear here as soon as someone books."
              />
            </Surface>
          )}
          {pending.map((b) => (
            <RequestCard
              key={b.id}
              booking={b}
              now={now}
              original={b.rescheduleOfId ? all.find((x) => x.id === b.rescheduleOfId) : undefined}
            />
          ))}
        </section>

        <aside className="flex flex-col gap-6">
          <Surface>
            <SurfaceHeader
              title={dateKey(now) === today ? "Tonight" : "This Thursday"}
              description={`${keyLabel(today)} · ${SCHEDULE.hoursLabel}`}
            />
            {bookings.isPending ? (
              <ListSkeleton rows={2} />
            ) : isBlocked ? (
              <p className="rounded-xl bg-surface-muted px-4 py-3 text-[15px] text-[#3f524b]">You cancelled this Thursday.</p>
            ) : (
              <DaySchedule rows={rows} now={now} />
            )}
          </Surface>

          <section className="rounded-[20px] bg-info-soft p-5 text-[#183a66]">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
              <CalendarOffIcon className="size-[18px]" aria-hidden="true" /> Unavailable dates
            </h2>
            {upcomingBlocked.length ? (
              <ul className="mb-3 text-sm">
                {upcomingBlocked.map((b) => (
                  <li key={b.date}>
                    {keyLabel(b.date, "dateShort")}
                    {b.reason ? ` · ${b.reason}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm">No Thursdays are cancelled.</p>
            )}
            <Button nativeButton={false} render={<Link href="/admin/calendar" />} variant="outline" size="sm">
              Manage in calendar
            </Button>
          </section>
        </aside>
      </div>
    </div>
  )
}
