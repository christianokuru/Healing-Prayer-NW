"use client"

import { cn } from "cn"

import { keyLabel, keyToDate, fmt } from "@/lib/domain/time"
import type { Booking, ThursdayAvailability } from "@/lib/domain/types"

interface DayPickerProps {
  days: ThursdayAvailability[]
  myBookings: Booking[]
  selected?: string
  onSelect: (date: string) => void
}

function describe(day: ThursdayAvailability, myBookings: Booking[]) {
  switch (day.state) {
    case "open":
      return { note: `${day.openCount} ${day.openCount === 1 ? "time" : "times"} left`, sub: "Open", tone: "open" }
    case "full":
      return { note: "Fully booked", sub: "Try another Thursday", tone: "off" }
    case "closed":
      return { note: "Booking closed", sub: "Less than 48 hours away", tone: "off" }
    case "cancelled":
      return { note: "No sessions", sub: "The ministry is away", tone: "off" }
    case "booked_by_me": {
      const mine = myBookings.find((b) => b.id === day.myBookingId)
      return {
        note: mine?.status === "pending" ? "You've requested" : "You're booked",
        sub: mine ? `${fmt.time(mine.slotStart)} · one per Thursday` : "One per Thursday",
        tone: "mine",
      }
    }
  }
}

export function DayPicker({ days, myBookings, selected, onSelect }: DayPickerProps) {
  return (
    <div role="radiogroup" aria-label="Thursdays" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {days.map((day) => {
        const d = describe(day, myBookings)
        const isSelected = selected === day.date
        const disabled = day.state !== "open"
        const date = keyToDate(day.date)
        return (
          <button
            key={day.date}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${keyLabel(day.date)}: ${d.note}`}
            disabled={disabled}
            onClick={() => onSelect(day.date)}
            className={cn(
              "flex min-h-[148px] flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-[border-color,box-shadow,background-color] duration-150",
              isSelected
                ? "border-2 border-primary bg-primary-soft text-primary-strong"
                : disabled
                  ? "cursor-not-allowed border-dashed border-[#c5d1cb] bg-surface-muted text-[#4a5a54]"
                  : "border-input bg-card hover:border-primary hover:shadow-[0_4px_14px_rgba(18,35,30,0.08)]"
            )}
          >
            <span className="text-xs font-semibold tracking-[0.06em] uppercase">
              {fmt.weekdayShort(date)} · {fmt.monthShort(date)}
            </span>
            <span className="font-heading text-[40px] leading-none font-medium">{fmt.dayNumber(date)}</span>
            <span
              className={cn(
                "mt-auto text-sm font-semibold",
                d.tone === "open" ? "text-primary-strong" : d.tone === "mine" ? "text-info-foreground" : "text-[#4a5a54]"
              )}
            >
              {d.note}
            </span>
            <span className="text-[13px] text-[#55675f]">{d.sub}</span>
          </button>
        )
      })}
    </div>
  )
}
