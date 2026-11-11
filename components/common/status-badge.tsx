import { cn } from "cn"
import {
  BanIcon,
  CheckIcon,
  CircleCheckBigIcon,
  ClockIcon,
  RepeatIcon,
  UserXIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import type { DisplayStatus } from "@/lib/domain/types"

type Tone = "success" | "warning" | "info" | "neutral" | "danger"

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-primary-soft text-primary-strong",
  warning: "bg-warning-soft text-warning-foreground",
  info: "bg-info-soft text-info-foreground",
  neutral: "bg-surface-muted text-[#44564f]",
  danger: "bg-danger-soft text-danger-foreground",
}

/** Visitor-facing wording. Admin can override a few labels. */
export const STATUS_META: Record<DisplayStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  pending: { label: "Waiting for approval", tone: "warning", icon: ClockIcon },
  confirmed: { label: "Confirmed", tone: "success", icon: CheckIcon },
  completed: { label: "Completed", tone: "info", icon: CircleCheckBigIcon },
  declined: { label: "Declined", tone: "neutral", icon: XIcon },
  cancelled: { label: "Cancelled", tone: "neutral", icon: BanIcon },
  cancelled_by_minister: { label: "Cancelled by ministry", tone: "neutral", icon: BanIcon },
  rescheduled: { label: "Moved to a new time", tone: "neutral", icon: RepeatIcon },
  no_show: { label: "Missed", tone: "danger", icon: UserXIcon },
  expired: { label: "Not confirmed in time", tone: "neutral", icon: ClockIcon },
}

interface StatusBadgeProps {
  status: DisplayStatus
  label?: string
  className?: string
  size?: "sm" | "md"
}

export function StatusBadge({ status, label, className, size = "md" }: StatusBadgeProps) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        size === "md" ? "px-3 py-1 text-[13px]" : "px-2.5 py-0.5 text-xs",
        TONE_CLASS[meta.tone],
        className
      )}
    >
      <Icon className={size === "md" ? "size-3.5" : "size-3"} strokeWidth={2.6} aria-hidden="true" />
      {label ?? meta.label}
    </span>
  )
}

export function ToneBadge({
  tone,
  children,
  className,
  icon: Icon,
}: {
  tone: Tone
  children: React.ReactNode
  className?: string
  icon?: LucideIcon
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLASS[tone],
        className
      )}
    >
      {Icon && <Icon className="size-3" strokeWidth={2.6} aria-hidden="true" />}
      {children}
    </span>
  )
}
