"use client"

import { MailIcon, PhoneIcon, UserSearchIcon } from "lucide-react"

import { EmptyState, ErrorState } from "@/components/common/feedback"
import { InitialsAvatar } from "@/components/common/initials-avatar"
import { StatusBadge } from "@/components/common/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useNow } from "@/hooks/use-now"
import { displayStatus } from "@/lib/domain/booking-rules"
import { fmt } from "@/lib/domain/time"
import { topicLabel } from "@/lib/domain/topics"

import { usePerson } from "../hooks"

/** One visitor's details and their prayer points over time. */
export function PersonPanel({ personId }: { personId: string | null }) {
  const now = useNow()
  const person = usePerson(personId)

  if (!personId) {
    return (
      <EmptyState
        icon={UserSearchIcon}
        title="Choose a person"
        description="Select a name to see their visits and prayer points over time."
      />
    )
  }
  if (person.isError) return <ErrorState error={person.error} onRetry={() => person.refetch()} />
  if (!person.data) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="flex items-center gap-3">
          <Skeleton className="size-14 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  const p = person.data
  const timeline = p.bookings.filter((b) => b.status !== "rescheduled")

  return (
    <div>
      <div className="flex items-center gap-3.5">
        <InitialsAvatar name={p.fullName} size="lg" />
        <div className="min-w-0">
          <h2 className="font-heading text-2xl leading-tight font-medium">{p.fullName}</h2>
          <div className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground">
            <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 truncate hover:text-primary-strong">
              <MailIcon className="size-3.5" aria-hidden="true" /> {p.email}
            </a>
            <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 hover:text-primary-strong">
              <PhoneIcon className="size-3.5" aria-hidden="true" /> {p.phone}
            </a>
          </div>
        </div>
      </div>

      <dl className="my-5 grid grid-cols-3 gap-2">
        {[
          ["Visits", p.completedCount],
          ["First visit", p.firstVisit ? fmt.dayMonthYear(p.firstVisit) : "—"],
          ["Missed", p.noShowCount],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl bg-surface-muted px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-[15px] font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mb-2 text-sm font-semibold text-[#3f524b]">Prayer points over time</h3>
      {timeline.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions yet. This will be their first visit.</p>
      ) : (
        <ol className="ml-1.5 border-l-2 border-border">
          {timeline.map((b) => (
            <li key={b.id} className="relative py-3 pl-5">
              <span className="absolute top-[18px] -left-[7px] size-3 rounded-full border-2 border-card bg-primary" aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-muted-foreground">
                {fmt.dayMonthYear(b.slotStart)} · {topicLabel(b.topic)}
                <StatusBadge status={displayStatus(b, now)} size="sm" />
              </div>
              <p className="mt-1 font-heading text-[16px] leading-relaxed text-[#26392f]">“{b.prayerPoints}”</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
