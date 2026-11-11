"use client"

import { cn } from "cn"
import Link from "next/link"
import { useState } from "react"

import { ErrorState } from "@/components/common/feedback"
import { InitialsAvatar } from "@/components/common/initials-avatar"
import { PageHeader } from "@/components/common/page-header"
import { StatTile } from "@/components/common/stat-tile"
import { Surface, SurfaceHeader } from "@/components/common/surface"
import { Skeleton } from "@/components/ui/skeleton"
import { topicLabel } from "@/lib/domain/topics"
import type { AnalyticsSummary } from "@/lib/domain/types"

import { useAnalytics } from "../hooks"

const PERIODS = [3, 6, 12] as const

function MonthlyBars({ monthly }: { monthly: AnalyticsSummary["monthly"] }) {
  const maxCap = Math.max(...monthly.map((m) => m.capacity), 1)
  const summary = monthly.map((m) => `${m.label} ${m.held} of ${m.capacity}`).join(", ")
  return (
    <figure>
      <div role="img" aria-label={`Sessions held each month: ${summary}`} className="flex h-56 items-end gap-2 sm:gap-3">
        {monthly.map((m, i) => (
          <div key={m.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-sm font-semibold tabular">{m.held}</span>
            <div
              className="flex w-full max-w-14 items-end overflow-hidden rounded-[10px] bg-[#edf2ef]"
              style={{ height: `${(m.capacity / maxCap) * 78}%` }}
            >
              <div
                className={cn("w-full rounded-t-[10px] transition-[height] duration-700", i === monthly.length - 1 ? "bg-[#7cb8a5]" : "bg-primary")}
                style={{ height: `${m.capacity ? (m.held / m.capacity) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground sm:text-[13px]">{m.label}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-[13px] text-muted-foreground">
        Dark bars show sessions held; the track behind shows available slots. The current month is lighter while it is
        still in progress.
      </figcaption>
    </figure>
  )
}

function TopicBars({ topics, total }: { topics: AnalyticsSummary["topics"]; total: number }) {
  if (!topics.length) return <p className="text-sm text-muted-foreground">No sessions in this period yet.</p>
  return (
    <ul className="flex flex-col gap-4">
      {topics.map((t, i) => {
        const pct = total ? Math.round((t.count / total) * 100) : 0
        return (
          <li key={t.topic}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-medium">{topicLabel(t.topic)}</span>
              <span className="text-[#3f524b] tabular">
                {t.count} · {pct}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#edf2ef]">
              <div className={cn("h-full rounded-full", i === 0 ? "bg-primary" : "bg-[#3f7fb0]")} style={{ width: `${pct}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function AdminAnalytics() {
  const [months, setMonths] = useState<(typeof PERIODS)[number]>(6)
  const analytics = useAnalytics(months)
  const a = analytics.data

  return (
    <div className="animate-rise">
      <PageHeader
        title="Analytics"
        description={a?.rangeLabel ?? " "}
        actions={
          <div role="group" aria-label="Period" className="inline-flex rounded-xl bg-[#e7edea] p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={months === p}
                onClick={() => setMonths(p)}
                className={cn(
                  "h-9 rounded-lg px-3.5 text-sm font-semibold transition-colors",
                  months === p ? "bg-card text-foreground shadow-sm" : "text-[#3f524b]"
                )}
              >
                {p} months
              </button>
            ))}
          </div>
        }
      />

      {analytics.isError && <ErrorState error={analytics.error} onRetry={() => analytics.refetch()} />}

      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {!a ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[124px] rounded-2xl" />)
        ) : (
          <>
            <StatTile label="Sessions held" value={a.sessionsHeld} footer={<span className="text-muted-foreground">across {a.thursdaysHeld} Thursdays</span>} />
            <StatTile label="People prayed for" value={a.peoplePrayedFor} footer={<span className="text-muted-foreground">{a.returningPeople} came more than once</span>} />
            <StatTile label="Attendance" value={`${a.attendanceRate}%`} footer={<span className="text-muted-foreground">{a.noShows} no-shows</span>} />
            <StatTile
              label="Online by Zoom"
              value={a.onlineSessions}
              footer={<span className="text-muted-foreground">{a.sessionsHeld ? Math.round((a.onlineSessions / a.sessionsHeld) * 100) : 0}% of sessions</span>}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Surface>
          <SurfaceHeader title="Sessions each month" description="Sessions held compared with available slots" />
          {a ? <MonthlyBars monthly={a.monthly} /> : <Skeleton className="h-56 rounded-xl" />}
        </Surface>
        <Surface>
          <SurfaceHeader title="What people ask prayer for" description="From the topic chosen when booking" />
          {a ? <TopicBars topics={a.topics} total={a.sessionsHeld} /> : <Skeleton className="h-56 rounded-xl" />}
        </Surface>
      </div>

      <Surface className="mt-6">
        <SurfaceHeader title="People who come often" description="Select a name to see their prayer history" />
        {!a ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : a.frequent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No returning visitors in this period yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {a.frequent.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/history?person=${p.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border p-3.5 transition-[border-color,box-shadow] hover:border-primary hover:shadow-[0_4px_14px_rgba(18,35,30,0.08)]"
                >
                  <InitialsAvatar name={p.fullName} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.fullName}</span>
                    <span className="block text-[13px] text-muted-foreground">
                      {p.completedCount} visits{p.topTopic ? ` · mostly ${topicLabel(p.topTopic).toLowerCase()}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  )
}
