"use client"

import { cn } from "cn"
import { ClockIcon } from "lucide-react"

import { fmt } from "@/lib/domain/time"
import type { SlotAvailability } from "@/lib/domain/types"

interface TimePickerProps {
  slots: SlotAvailability[]
  selected?: string
  /** When rescheduling: the visitor's current time, which can't be chosen again. */
  currentStart?: string
  onSelect: (slotStart: string) => void
}

const NOTE = { open: "Available", taken: "Already taken", mine: "Your session", current: "Your current time" } as const

export function TimePicker({ slots, selected, currentStart, onSelect }: TimePickerProps) {
  return (
    <div role="radiogroup" aria-label="Times" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {slots.map((slot) => {
        const state = slot.start === currentStart ? "current" : slot.state
        const isSelected = selected === slot.start
        const disabled = state !== "open"
        return (
          <button
            key={slot.start}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${fmt.time(slot.start)}: ${NOTE[state]}`}
            disabled={disabled}
            onClick={() => onSelect(slot.start)}
            className={cn(
              "flex min-h-[112px] flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition-[border-color,box-shadow,background-color] duration-150",
              isSelected
                ? "border-2 border-primary bg-primary-soft text-primary-strong"
                : state === "current"
                  ? "cursor-not-allowed border-info/40 bg-info-soft text-info-foreground"
                  : disabled
                    ? "cursor-not-allowed border-dashed border-[#c5d1cb] bg-surface-muted text-[#4a5a54]"
                    : "border-input bg-card hover:border-primary hover:shadow-[0_4px_14px_rgba(18,35,30,0.08)]"
            )}
          >
            <ClockIcon className="size-5" aria-hidden="true" />
            <span className="text-xl font-semibold tabular">{fmt.time(slot.start)}</span>
            <span className={cn("text-sm font-medium", disabled ? "" : "text-primary-strong")}>
              {isSelected ? "Selected" : NOTE[state]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
