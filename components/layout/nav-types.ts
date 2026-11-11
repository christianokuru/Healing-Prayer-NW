import type { LucideIcon } from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Only active on an exact path match (for section roots). */
  exact?: boolean
  badge?: number
}

export const isNavActive = (item: Pick<NavItem, "href" | "exact">, pathname: string) =>
  item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
