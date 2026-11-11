"use client"

import { CalendarCheckIcon, CalendarXIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { Field } from "@/components/forms/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { errorMessage } from "@/lib/api/errors"
import { keyLabel } from "@/lib/domain/time"
import type { BlockedDate } from "@/lib/domain/types"

import { useBlockDate, useUnblockDate } from "../hooks"

interface BlockDayControlsProps {
  date: string
  blocked?: BlockedDate
  /** Active bookings that would be cancelled and emailed. */
  affected: number
}

/** "I'm not available this Thursday" and its undo. */
export function BlockDayControls({ date, blocked, affected }: BlockDayControlsProps) {
  const block = useBlockDate()
  const unblock = useUnblockDate()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const label = keyLabel(date)

  const restore = () =>
    unblock.mutate(date, {
      onSuccess: () => toast.success(`${label} is open for booking again.`),
      onError: (e) => toast.error(errorMessage(e)),
    })

  if (blocked) {
    return (
      <div className="rounded-2xl border border-dashed border-[#b9c7c0] bg-surface-muted p-4 text-center">
        <p className="text-[15px] text-[#3f524b]">
          This Thursday is cancelled{blocked.reason ? `: ${blocked.reason}` : ""}. Visitors can&apos;t book it.
        </p>
        <Button variant="outline" className="mt-3" disabled={unblock.isPending} onClick={restore}>
          <CalendarCheckIcon aria-hidden="true" /> Make available again
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">Bookings that were cancelled stay cancelled.</p>
      </div>
    )
  }

  return (
    <>
      <Button variant="destructive-outline" className="w-full" onClick={() => setOpen(true)}>
        <CalendarXIcon aria-hidden="true" /> I&apos;m not available this Thursday
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        title={`Cancel ${label}?`}
        description={
          affected === 0
            ? "Nobody is booked yet. Visitors simply won't be able to choose this date."
            : `${affected} ${affected === 1 ? "person is" : "people are"} booked. Each will get an email saying this Thursday is cancelled, with a link to choose another date.`
        }
        confirmLabel="Yes, cancel this Thursday"
        cancelLabel="Keep it"
        pending={block.isPending}
        onConfirm={() =>
          block.mutate(
            { date, reason: reason.trim() || undefined },
            {
              onSuccess: ({ affected: n }) => {
                setOpen(false)
                setReason("")
                toast.success(`${label} is cancelled.${n ? ` ${n} ${n === 1 ? "visitor" : "visitors"} will be emailed.` : ""}`, {
                  action: { label: "Undo", onClick: restore },
                })
              },
              onError: (e) => toast.error(errorMessage(e)),
            }
          )
        }
      >
        <Field label={<>Reason <span className="font-normal text-muted-foreground">(only you see this)</span></>}>
          {({ id }) => (
            <Input
              id={id}
              maxLength={80}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="For example: travelling"
            />
          )}
        </Field>
      </ConfirmDialog>
    </>
  )
}
