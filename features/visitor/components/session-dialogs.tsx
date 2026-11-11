"use client"

import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage } from "@/lib/api/errors"
import { fmt } from "@/lib/domain/time"
import type { Booking } from "@/lib/domain/types"

import { useCancelBooking, useSendLateNotice } from "../hooks"

interface DialogProps {
  booking: Booking
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Cancel a confirmed session or withdraw a pending request (48h+ notice). */
export function CancelBookingDialog({ booking, open, onOpenChange }: DialogProps) {
  const cancel = useCancelBooking()
  const isRequest = booking.status === "pending"
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="danger"
      title={isRequest ? "Withdraw this request?" : "Cancel this session?"}
      description={
        <>
          {fmt.dateLong(booking.slotStart)} at {fmt.time(booking.slotStart)}.{" "}
          {isRequest
            ? "The time will be released so someone else can book it."
            : "Your time will be offered to someone else. You can book again whenever you like."}
        </>
      }
      confirmLabel={isRequest ? "Withdraw request" : "Cancel session"}
      cancelLabel="Keep it"
      pending={cancel.isPending}
      onConfirm={() =>
        cancel.mutateAsync(booking.id).then(
          () => {
            onOpenChange(false)
            toast.success(isRequest ? "Your request has been withdrawn." : "Your session has been cancelled.")
          },
          (e) => toast.error(errorMessage(e))
        )
      }
    />
  )
}

/** Inside 48 hours: let the minister know instead of a silent no-show. */
export function LateNoticeDialog({ booking, open, onOpenChange }: DialogProps) {
  const notice = useSendLateNotice()
  const [message, setMessage] = useState("")
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="danger"
      title="Can't make it?"
      description={
        <>
          Your session on {fmt.dateLong(booking.slotStart)} is less than 48 hours away. We&apos;ll let the prayer
          minister know you can&apos;t come. Thank you for telling us.
        </>
      }
      confirmLabel="Let them know"
      cancelLabel="I can still come"
      pending={notice.isPending}
      onConfirm={() =>
        notice.mutateAsync({ bookingId: booking.id, message: message.trim() || undefined }).then(
          () => {
            onOpenChange(false)
            setMessage("")
            toast.success("Thank you. The prayer minister has been told.")
          },
          (e) => toast.error(errorMessage(e))
        )
      }
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="late-note" className="text-[15px] font-semibold">
          Add a short note <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="late-note"
          maxLength={200}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-24"
          placeholder="For example: I'm unwell this week."
        />
      </div>
    </ConfirmDialog>
  )
}
