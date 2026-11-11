"use client"

import { CalendarHeartIcon, PlusIcon } from "lucide-react"
import Link from "next/link"

import { CrisisNote } from "@/components/common/crisis-note"
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/feedback"
import { PageHeader } from "@/components/common/page-header"
import { StatusBadge } from "@/components/common/status-badge"
import { Surface, SurfaceHeader } from "@/components/common/surface"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@/features/auth/hooks"
import { InstallAppCard } from "@/features/pwa/install-app-card"
import { useNow } from "@/hooks/use-now"
import { displayStatus } from "@/lib/domain/booking-rules"
import { fmt, greetingFor } from "@/lib/domain/time"
import { modeLabel } from "@/lib/domain/topics"

import { useMyBookings } from "../hooks"
import { groupVisitorBookings } from "../selectors"
import { HowItWorksCard, LocationCard } from "./info-cards"
import { NextSessionCard } from "./next-session-card"
import { SessionCard } from "./session-card"

export function VisitorHome() {
  const user = useUser()
  const now = useNow()
  const bookings = useMyBookings()
  const firstName = user.fullName.split(" ")[0]

  const groups = bookings.data ? groupVisitorBookings(bookings.data, now) : null
  const others = groups?.upcoming.filter((b) => b.id !== groups.next?.id) ?? []

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow={fmt.dateFull(now)}
        title={`${greetingFor(now)}, ${firstName}.`}
        description={
          groups?.next ? "We're glad you're here. Your next prayer time is below." : "We're glad you're here."
        }
        actions={
          <Button nativeButton={false} render={<Link href="/dashboard/book" />} size="lg" className="w-full sm:w-auto">
            <PlusIcon aria-hidden="true" /> Book a prayer session
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          {bookings.isPending && (
            <>
              <Skeleton className="h-72 rounded-[24px]" />
              <ListSkeleton rows={2} />
            </>
          )}
          {bookings.isError && <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />}

          {groups && !groups.next && (
            <Surface>
              <EmptyState
                icon={CalendarHeartIcon}
                title="No upcoming sessions"
                description="Whenever you're ready, choose a Thursday evening and request a time. It's always free."
                action={
                  <Button nativeButton={false} render={<Link href="/dashboard/book" />} size="lg">
                    Book a prayer session
                  </Button>
                }
              />
            </Surface>
          )}

          {groups?.next && (
            <NextSessionCard
              booking={groups.next}
              now={now}
              hasReschedulePending={groups.rescheduleOf.has(groups.next.id)}
            />
          )}

          {others.length > 0 && (
            <section aria-label="Other upcoming sessions" className="flex flex-col gap-3">
              <h2 className="font-heading text-[22px] font-medium">Also coming up</h2>
              {others.map((b) => (
                <SessionCard
                  key={b.id}
                  booking={b}
                  now={now}
                  actionable
                  hasReschedulePending={groups!.rescheduleOf.has(b.id)}
                />
              ))}
            </section>
          )}

          {groups && groups.past.length > 0 && (
            <Surface>
              <SurfaceHeader
                title="Past sessions"
                action={
                  <Button nativeButton={false} render={<Link href="/dashboard/sessions?tab=past" />} variant="ghost" size="sm">
                    See all
                  </Button>
                }
              />
              <ul className="divide-y divide-border">
                {groups.past.slice(0, 3).map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3.5 first:pt-0 last:pb-0">
                    <div>
                      <div className="font-semibold">{fmt.dateLong(b.slotStart)}</div>
                      <div className="text-sm text-muted-foreground">
                        {fmt.time(b.slotStart)} · {modeLabel(b.mode)}
                      </div>
                    </div>
                    <StatusBadge status={displayStatus(b, now)} size="sm" />
                  </li>
                ))}
              </ul>
            </Surface>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <InstallAppCard />
          <HowItWorksCard />
          <LocationCard />
          <CrisisNote />
        </aside>
      </div>
    </div>
  )
}
