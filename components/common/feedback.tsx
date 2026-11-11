import { cn } from "cn"
import { CloudOffIcon, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/api/errors"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[15px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger-foreground">
        <CloudOffIcon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-semibold">We couldn&apos;t load this</h3>
      <p className="mt-1 max-w-sm text-[15px] text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/** A stack of placeholder rows while data loads. */
export function ListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
