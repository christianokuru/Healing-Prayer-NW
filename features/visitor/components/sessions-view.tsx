"use client"

import { cn } from "cn"
import { CalendarHeartIcon, HistoryIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/feedback"
import { PageHeader } from "@/components/common/page-header"
import { Surface } from "@/components/common/surface"
import { Button } from "@/components/ui/button"
import { useNow } from "@/hooks/use-now"

import { useMyBookings } from "../hooks"
import { groupVisitorBookings } from "../selectors"
import { SessionCard } from "./session-card"

type Tab = "upcoming" | "past"

export function SessionsView() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tab: Tab = params.get("tab") === "past" ? "past" : "upcoming"
  const now = useNow()
  const bookings = useMyBookings()
  const groups = bookings.data ? groupVisitorBookings(bookings.data, now) : null

  const setTab = (t: Tab) => router.replace(t === "past" ? `${pathname}?tab=past` : pathname, { scroll: false })
  const list = tab === "upcoming" ? groups?.upcoming : groups?.past

  return (
    <div className="animate-rise">
      <PageHeader
        title="My sessions"
        actions={
          <Button nativeButton={false} render={<Link href="/dashboard/book" />} className="hidden sm:inline-flex">
            Book a session
          </Button>
        }
      />

      <div role="tablist" aria-label="Sessions" className="mb-5 inline-flex rounded-xl bg-[#e7edea] p-1">
        {(["upcoming", "past"] as const).map((t) => {
          const count = t === "upcoming" ? groups?.upcoming.length : groups?.past.length
          const active = tab === t
          return (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(t)}
              className={cn(
                "h-10 rounded-lg px-4 text-[15px] font-semibold transition-colors",
                active ? "bg-card text-foreground shadow-sm" : "text-[#3f524b] hover:text-foreground"
              )}
            >
              {t === "upcoming" ? "Upcoming" : "Past"}
              {count !== undefined && <span className="ml-1.5 text-muted-foreground tabular">({count})</span>}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" className="flex flex-col gap-3">
        {bookings.isPending && <ListSkeleton rows={3} />}
        {bookings.isError && <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />}
        {list && list.length === 0 && (
          <Surface>
            {tab === "upcoming" ? (
              <EmptyState
                icon={CalendarHeartIcon}
                title="Nothing booked yet"
                description="When you request a session, it will appear here."
                action={
                  <Button nativeButton={false} render={<Link href="/dashboard/book" />}>
                    Book a prayer session
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={HistoryIcon} title="No past sessions" description="Your past sessions will be listed here." />
            )}
          </Surface>
        )}
        {list?.map((b) => (
          <SessionCard
            key={b.id}
            booking={b}
            now={now}
            actionable={tab === "upcoming"}
            hasReschedulePending={groups!.rescheduleOf.has(b.id)}
          />
        ))}
        {tab === "upcoming" && (
          <p className="px-1 pt-2 text-sm text-muted-foreground">
            Need to cancel within 48 hours of your session? Use “Can&apos;t make it?” so your time can be given to
            someone else.
          </p>
        )}
      </div>
    </div>
  )
}
