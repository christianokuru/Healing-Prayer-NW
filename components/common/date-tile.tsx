import { cn } from "cn"

import { fmt } from "@/lib/domain/time"

const TONES = {
  primary: "bg-primary-soft text-primary-strong",
  warning: "bg-warning-soft text-warning-foreground",
  neutral: "bg-surface-muted text-[#3f524b]",
  info: "bg-info-soft text-info-foreground",
}

/** Compact month/day block used in lists. */
export function DateTile({
  iso,
  tone = "neutral",
  className,
}: {
  iso: string
  tone?: keyof typeof TONES
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl leading-none",
        TONES[tone],
        className
      )}
      aria-hidden="true"
    >
      <span className="text-[11px] font-semibold tracking-[0.06em] uppercase">{fmt.monthShort(iso)}</span>
      <span className="mt-1 font-heading text-[26px] font-medium">{fmt.dayNumber(iso)}</span>
    </span>
  )
}
