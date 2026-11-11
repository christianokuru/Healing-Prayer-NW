import { cn } from "cn"
import type { ReactNode } from "react"

interface StatTileProps {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  footer?: ReactNode
  className?: string
}

export function StatTile({ label, value, unit, footer, className }: StatTileProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 md:p-5", className)}>
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-heading text-[34px] leading-none tabular">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {footer && <div className="mt-3 text-[13px]">{footer}</div>}
    </div>
  )
}
