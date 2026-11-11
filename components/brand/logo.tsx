import { cn } from "cn"
import Link from "next/link"

import { MINISTRY } from "@/lib/config/ministry"

export function LeafIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

export function LogoMark({ className, tone = "solid" }: { className?: string; tone?: "solid" | "glass" }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl text-white",
        tone === "solid" ? "bg-primary-strong" : "bg-white/12",
        className
      )}
    >
      <LeafIcon className="size-[22px]" />
    </span>
  )
}

interface LogoProps {
  href?: string
  /** Use the short name where space is tight (e.g. the admin sidebar). */
  short?: boolean
  tone?: "dark" | "light"
  subtitle?: string
  className?: string
}

export function Logo({ href = "/", tone = "dark", subtitle = MINISTRY.tagline, short, className }: LogoProps) {
  return (
    <Link href={href} className={cn("flex items-center gap-3 rounded-xl", className)} aria-label={`${MINISTRY.name} home`}>
      <LogoMark tone={tone === "light" ? "glass" : "solid"} />
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            "font-heading text-[19px] font-medium tracking-tight",
            tone === "light" ? "text-white" : "text-foreground"
          )}
        >
          {short ? MINISTRY.shortName : MINISTRY.name}
        </span>
        {subtitle && (
          <span
            className={cn(
              "text-[11px] font-medium tracking-[0.06em] uppercase",
              tone === "light" ? "text-white/70" : "text-muted-foreground"
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  )
}
