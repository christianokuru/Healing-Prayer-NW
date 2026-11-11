"use client"

import { cn } from "cn"
import { CalendarPlusIcon, HouseIcon, ListIcon, UserRoundIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { Logo } from "@/components/brand/logo"
import { BottomNav } from "@/components/layout/bottom-nav"
import { isNavActive, type NavItem } from "@/components/layout/nav-types"
import { UserMenu } from "@/components/layout/user-menu"

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: HouseIcon, exact: true },
  { href: "/dashboard/book", label: "Book", icon: CalendarPlusIcon },
  { href: "/dashboard/sessions", label: "Sessions", icon: ListIcon },
  { href: "/dashboard/profile", label: "Profile", icon: UserRoundIcon },
]

const DESKTOP_LABELS: Record<string, string> = {
  "/dashboard/book": "Book a session",
  "/dashboard/sessions": "My sessions",
}

export function VisitorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:h-[72px] md:px-8">
          <Logo href="/dashboard" subtitle="" className="md:hidden" />
          <Logo href="/dashboard" className="hidden md:flex" />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.filter((n) => n.href !== "/dashboard/profile").map((item) => {
              const active = isNavActive(item, pathname)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-2 rounded-xl px-3.5 text-[15px] font-medium transition-colors",
                    active ? "bg-primary-soft font-semibold text-primary-strong" : "text-[#3f524b] hover:bg-surface-muted"
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden="true" />
                  {DESKTOP_LABELS[item.href] ?? item.label}
                </Link>
              )
            })}
          </nav>
          <UserMenu profileHref="/dashboard/profile" />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-6 pb-nav md:px-8 md:pt-10 md:pb-16">
        {children}
      </main>
      <BottomNav items={NAV} label="Main" className="md:hidden" />
    </div>
  )
}
