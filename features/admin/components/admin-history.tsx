"use client"

import { cn } from "cn"
import { DownloadIcon, HistoryIcon, SearchIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/feedback"
import { InitialsAvatar } from "@/components/common/initials-avatar"
import { PageHeader } from "@/components/common/page-header"
import { STATUS_META, StatusBadge } from "@/components/common/status-badge"
import { Surface } from "@/components/common/surface"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useNow } from "@/hooks/use-now"
import { HOUR_MS, fmt } from "@/lib/domain/time"
import { modeLabel, topicLabel } from "@/lib/domain/topics"
import { downloadText, toCsv } from "@/lib/files"

import { useAdminBookings } from "../hooks"
import { pastSessions } from "../selectors"
import { PersonPanel } from "./person-panel"

const RANGES = [
  { id: "month", label: "Last 30 days", days: 30 },
  { id: "3m", label: "Last 3 months", days: 92 },
  { id: "year", label: "Last year", days: 366 },
  { id: "all", label: "All time", days: Infinity },
] as const
type RangeId = (typeof RANGES)[number]["id"]

const ADMIN_LABEL: Partial<Record<string, string>> = { no_show: "No-show", pending: "Not answered" }

export function AdminHistory() {
  const now = useNow()
  const bookings = useAdminBookings()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const wide = useMediaQuery("(min-width: 1024px)")
  const [query, setQuery] = useState("")
  const [range, setRange] = useState<RangeId>(params.get("person") ? "all" : "3m")
  const personId = params.get("person")

  const setPerson = (id: string | null) =>
    router.replace(id ? `${pathname}?person=${id}` : pathname, { scroll: false })

  const rows = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)!.days
    const since = now.getTime() - days * 24 * HOUR_MS
    const q = query.trim().toLowerCase()
    return pastSessions(bookings.data ?? [], now).filter(
      (b) =>
        new Date(b.slotStart).getTime() >= since &&
        (!q || b.visitor.fullName.toLowerCase().includes(q) || b.visitor.email.toLowerCase().includes(q))
    )
  }, [bookings.data, now, query, range])

  const exportCsv = () => {
    const csv = toCsv(
      ["Date", "Time", "Visitor", "Email", "Phone", "Topic", "Attended", "Status", "Prayer points"],
      rows.map((b) => [
        fmt.dayMonthYear(b.slotStart),
        fmt.time(b.slotStart),
        b.visitor.fullName,
        b.visitor.email,
        b.visitor.phone,
        topicLabel(b.topic),
        modeLabel(b.mode),
        ADMIN_LABEL[b.display] ?? STATUS_META[b.display].label,
        b.prayerPoints,
      ])
    )
    downloadText(`prayer-sessions-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv")
    toast.success(`Downloaded ${rows.length} ${rows.length === 1 ? "session" : "sessions"}.`)
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="Session history"
        description="Every past session. Select a name to see their prayer points over time."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <DownloadIcon aria-hidden="true" /> Download spreadsheet
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-80">
          <label htmlFor="history-search" className="sr-only">
            Search by name or email
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="history-search"
            type="search"
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-11"
          />
        </div>
        <div role="group" aria-label="Time range" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 md:pb-0">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={range === r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                "h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                range === r.id
                  ? "border-primary-strong bg-primary-strong text-white"
                  : "border-input bg-card text-[#3f524b] hover:border-primary"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {bookings.isPending && <ListSkeleton rows={5} />}
          {bookings.isError && <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />}
          {bookings.data && rows.length === 0 && (
            <Surface>
              <EmptyState icon={HistoryIcon} title="No sessions match" description="Try a different name or a longer time range." />
            </Surface>
          )}
          {rows.length > 0 && (
            <>
              <p className="mb-2 px-1 text-sm text-muted-foreground" aria-live="polite">
                {rows.length} {rows.length === 1 ? "session" : "sessions"}
              </p>
              {/* Phones: cards */}
              <ul className="flex flex-col gap-2 md:hidden">
                {rows.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setPerson(b.visitor.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border bg-card p-3.5 text-left",
                        personId === b.visitor.id ? "border-primary bg-primary-soft" : "border-border"
                      )}
                    >
                      <InitialsAvatar name={b.visitor.fullName} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{b.visitor.fullName}</span>
                        <span className="block text-[13px] text-muted-foreground">
                          {fmt.dateShort(b.slotStart)} · {fmt.time(b.slotStart)} · {topicLabel(b.topic)}
                        </span>
                      </span>
                      <StatusBadge status={b.display} label={ADMIN_LABEL[b.display]} size="sm" />
                    </button>
                  </li>
                ))}
              </ul>
              {/* Larger screens: table */}
              <div className="hidden overflow-x-auto rounded-[20px] border border-border bg-card md:block">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                      <th scope="col" className="border-b border-border px-5 py-3.5 font-semibold">Date</th>
                      <th scope="col" className="border-b border-border px-3 py-3.5 font-semibold">Visitor</th>
                      <th scope="col" className="border-b border-border px-3 py-3.5 font-semibold">Topic</th>
                      <th scope="col" className="border-b border-border px-3 py-3.5 font-semibold">Attended</th>
                      <th scope="col" className="border-b border-border px-5 py-3.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((b) => (
                      <tr key={b.id} className={cn("border-b border-border last:border-b-0", personId === b.visitor.id && "bg-primary-soft")}>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="font-semibold">{fmt.dayMonthYear(b.slotStart)}</span>{" "}
                          <span className="text-muted-foreground">· {fmt.time(b.slotStart)}</span>
                        </td>
                        <td className="px-3 py-1.5">
                          <button
                            type="button"
                            onClick={() => setPerson(b.visitor.id)}
                            className="h-10 font-semibold hover:text-primary-strong hover:underline"
                          >
                            {b.visitor.fullName}
                          </button>
                        </td>
                        <td className="px-3 py-3">{topicLabel(b.topic)}</td>
                        <td className="px-3 py-3">{b.mode === "online" ? "Zoom" : "In person"}</td>
                        <td className="px-5 py-3">
                          <StatusBadge status={b.display} label={ADMIN_LABEL[b.display]} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {wide ? (
          <Surface className="sticky top-6 self-start">
            <PersonPanel personId={personId} />
          </Surface>
        ) : (
          <Sheet open={!!personId} onOpenChange={(o) => !o && setPerson(null)}>
            <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-[24px] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]" data-lenis-prevent>
              <SheetTitle className="sr-only">Visitor history</SheetTitle>
              <span className="mx-auto -mt-1 mb-2 block h-1.5 w-10 rounded-full bg-[#d5ddd9]" aria-hidden="true" />
              <PersonPanel personId={personId} />
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  )
}
