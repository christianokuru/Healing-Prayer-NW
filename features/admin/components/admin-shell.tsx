"use client"

import { cn } from "cn"
import { CalendarDaysIcon, ChartColumnIcon, HistoryIcon, HouseIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { Logo } from "@/components/brand/logo"
import { BottomNav } from "@/components/layout/bottom-nav"
import { isNavActive, type NavItem } from "@/components/layout/nav-types"
import { UserMenu } from "@/components/layout/user-menu"
import { useSession } from "@/features/auth/hooks"
import { useNow } from "@/hooks/use-now"

import { useAdminBookings } from "../hooks"
import { pendingRequests } from "../selectors"

const BASE_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: HouseIcon, exact: true },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDaysIcon },
  { href: "/admin/history", label: "History", icon: HistoryIcon },
  { href: "/admin/analytics", label: "Analytics", icon: ChartColumnIcon },
]

/** Pending count badge, only fetched once we know this is the admin. */
function usePendingCount() {
  const { data: user } = useSession()
  const now = useNow()
  const bookings = useAdminBookings()
  if (user?.role !== "admin" || !bookings.data) return 0
  return pendingRequests(bookings.data, now).length
}

function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col gap-8 bg-primary-deep px-4 py-6 text-white lg:flex">
      <Logo href="/admin" tone="light" subtitle="Admin" short className="px-2" />
      <nav aria-label="Admin" className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isNavActive(item, pathname)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-12 items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium transition-colors",
                active ? "bg-white/14 font-semibold text-white" : "text-white/80 hover:bg-white/8 hover:text-white"
              )}
            >
              <Icon className="size-[19px]" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {!!item.badge && (
                <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-warning px-1.5 text-xs font-bold text-[#3a2800]">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto border-t border-white/12 pt-4">
        <UserMenu tone="light" />
      </div>
    </aside>
  )
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pending = usePendingCount()
  const items = BASE_NAV.map((n) => (n.href === "/admin" ? { ...n, badge: pending } : n))
  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar items={items} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 pt-safe backdrop-blur-xl lg:hidden">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-8">
            <Logo href="/admin" subtitle="Admin" short />
            <UserMenu showName={false} />
          </div>
        </header>
        <main id="main" className="mx-auto max-w-[1200px] px-4 pt-6 pb-nav md:px-8 md:pt-8 lg:px-10 lg:pt-10 lg:pb-16">
          {children}
        </main>
      </div>
      <BottomNav items={items} label="Admin" className="lg:hidden" />
    </div>
  )
}
