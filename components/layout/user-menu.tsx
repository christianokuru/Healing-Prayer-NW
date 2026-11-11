"use client"

import { useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { ChevronDownIcon, LogOutIcon, RotateCcwIcon, UserRoundIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { InitialsAvatar } from "@/components/common/initials-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useLogout, useSession } from "@/features/auth/hooks"
import { isMockApi } from "@/lib/api"
import { resetMockData } from "@/lib/api/mock"
import { writeRoleCookie } from "@/lib/auth/session-cookie"

interface UserMenuProps {
  profileHref?: string
  tone?: "light" | "dark"
  showName?: boolean
}

export function UserMenu({ profileHref, tone = "dark", showName = true }: UserMenuProps) {
  const { data: user } = useSession()
  const logout = useLogout()
  const router = useRouter()
  const queryClient = useQueryClient()

  if (!user) return <Skeleton className="size-10 rounded-full" />

  const resetDemo = () => {
    resetMockData()
    writeRoleCookie(null)
    router.replace("/login")
    setTimeout(() => queryClient.clear(), 50)
  }

  return (
    // Non-modal: a small menu shouldn't lock page scroll (which shifts the sticky header on phones).
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          "flex h-11 items-center gap-2.5 rounded-full pr-2 pl-1 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
          tone === "light" ? "text-white hover:bg-white/10" : "hover:bg-surface-muted"
        )}
        aria-label="Account menu"
      >
        <InitialsAvatar name={user.fullName} size="sm" className={tone === "light" ? "bg-white/15 text-white" : ""} />
        {showName && (
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-semibold">{user.fullName}</span>
            <span className={cn("block text-xs", tone === "light" ? "text-white/70" : "text-muted-foreground")}>
              {user.role === "admin" ? "Prayer minister" : "My account"}
            </span>
          </span>
        )}
        <ChevronDownIcon className="size-4 opacity-60" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-xl p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 py-2">
            <span className="block text-sm font-semibold text-foreground">{user.fullName}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {profileHref && (
          <DropdownMenuItem className="h-10 gap-2.5 px-2.5 text-[15px]" onClick={() => router.push(profileHref)}>
            <UserRoundIcon className="size-4" aria-hidden="true" /> My profile
          </DropdownMenuItem>
        )}
        {isMockApi && (
          <DropdownMenuItem className="h-10 gap-2.5 px-2.5 text-[15px]" onClick={resetDemo}>
            <RotateCcwIcon className="size-4" aria-hidden="true" /> Reset demo data
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="h-10 gap-2.5 px-2.5 text-[15px]"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <LogOutIcon className="size-4" aria-hidden="true" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
