import { cn } from "cn"
import type { ComponentProps, ReactNode } from "react"

/** The white rounded panel used for every content block. */
export function Surface({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-[20px] border border-border bg-card p-5 md:p-6", className)}
      {...props}
    />
  )
}

export function SurfaceHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="font-heading text-[22px] leading-tight font-medium md:text-2xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
