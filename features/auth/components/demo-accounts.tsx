"use client"

import { FlaskConicalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { isMockApi } from "@/lib/api"
import { DEMO_ACCOUNTS } from "@/lib/api/mock"

/** Mock mode only: one-tap sign-in details for trying both dashboards. */
export function DemoAccounts({ onPick }: { onPick: (email: string, password: string) => void }) {
  if (!isMockApi) return null
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-input bg-card/60 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#3f524b]">
        <FlaskConicalIcon className="size-4" aria-hidden="true" />
        Demo mode: try either account
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10"
          onClick={() => onPick(DEMO_ACCOUNTS.visitor.email, DEMO_ACCOUNTS.visitor.password)}
        >
          Visitor
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10"
          onClick={() => onPick(DEMO_ACCOUNTS.admin.email, DEMO_ACCOUNTS.admin.password)}
        >
          Prayer minister
        </Button>
      </div>
    </div>
  )
}
