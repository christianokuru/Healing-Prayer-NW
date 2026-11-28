"use client"

import { FlaskConicalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { isMockApi } from "@/lib/api"
import { DEMO_ADMIN } from "@/lib/api/mock"

/** Mock mode only: one-tap sign-in details for trying the admin dashboard. */
export function DemoAccounts({ onPick }: { onPick: (email: string, password: string) => void }) {
  if (!isMockApi) return null
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-input bg-card/60 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#3f524b]">
        <FlaskConicalIcon className="size-4" aria-hidden="true" />
        Demo mode
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 w-full"
        onClick={() => onPick(DEMO_ADMIN.email, DEMO_ADMIN.password)}
      >
        Fill in the demo prayer minister account
      </Button>
    </div>
  )
}
