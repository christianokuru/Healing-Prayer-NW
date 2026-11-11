import { cn } from "cn"
import type { ReactNode } from "react"

interface PageHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8", className)}>
      <div className="min-w-0 flex-1 basis-72">
        {eyebrow && <p className="mb-1 text-sm font-medium text-muted-foreground">{eyebrow}</p>}
        <h1 className="font-heading text-[32px] leading-[1.1] font-medium tracking-[-0.02em] md:text-[40px]">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-xl text-base text-[#44564f] md:text-[17px]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
