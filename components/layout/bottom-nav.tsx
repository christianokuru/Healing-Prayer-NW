"use client"

import { cn } from "cn"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { isNavActive, type NavItem } from "./nav-types"

/** Thumb-friendly tab bar for phones. Hidden on larger screens by the caller. */
export function BottomNav({ items, className, label }: { items: NavItem[]; className?: string; label: string }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label={label}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/92 pb-safe backdrop-blur-xl supports-[backdrop-filter]:bg-card/80",
        className
      )}
    >
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isNavActive(item, pathname)
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11.5px] font-medium transition-colors",
                  active ? "text-primary-strong" : "text-[#55675f] hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200",
                    active && "bg-primary-soft"
                  )}
                >
                  <Icon className="size-[21px]" strokeWidth={active ? 2.2 : 1.9} aria-hidden="true" />
                  {!!item.badge && (
                    <span className="absolute -top-1 right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-warning px-1 text-[11px] font-bold text-[#3a2800]">
                      {item.badge}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
