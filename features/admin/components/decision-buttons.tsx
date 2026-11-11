"use client"

import { cn } from "cn"
import { CheckIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { Field } from "@/components/forms/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage } from "@/lib/api/errors"
import { LIMITS } from "@/lib/config/ministry"
import { fmt } from "@/lib/domain/time"
import type { AdminBooking } from "@/lib/domain/types"

import { useApprove, useDecline, useRevertDecision } from "../hooks"

const firstName = (b: AdminBooking) => b.visitor.fullName.split(" ")[0]
const isZoomUrl = (v: string) => /^https:\/\/[^\s]+$/i.test(v.trim())

/**
 * Approve / Decline for one request. In-person approvals are one tap with
 * Undo; online approvals ask for the Zoom link first.
 */
export function DecisionButtons({
  booking,
  size = "default",
  className,
}: {
  booking: AdminBooking
  size?: "default" | "sm"
  className?: string
}) {
  const approve = useApprove()
  const decline = useDecline()
  const revert = useRevertDecision()
  const [dialog, setDialog] = useState<"zoom" | "decline" | null>(null)
  const [zoomLink, setZoomLink] = useState("")
  const [message, setMessage] = useState("")
  const busy = approve.isPending || decline.isPending

  // mutateAsync (not mutate + callbacks): the card unmounts as soon as the
  // optimistic update removes it, and the toast must still appear.
  const undo = () =>
    revert.mutateAsync(booking.id).then(
      () => toast("Undone. The request is waiting again."),
      (e) => toast.error(errorMessage(e))
    )

  const doApprove = (link?: string) =>
    approve.mutateAsync({ bookingId: booking.id, zoomLink: link }).then(
      () => {
        setDialog(null)
        toast.success(`Approved. ${firstName(booking)} will get a confirmation email.`, {
          action: { label: "Undo", onClick: undo },
        })
      },
      (e) => toast.error(errorMessage(e))
    )

  const doDecline = () =>
    decline.mutateAsync({ bookingId: booking.id, message: message.trim() || undefined }).then(
      () => {
        setDialog(null)
        setMessage("")
        toast.success(`Declined. ${firstName(booking)} will get a kind email letting them know.`, {
          action: { label: "Undo", onClick: undo },
        })
      },
      (e) => toast.error(errorMessage(e))
    )

  const when = `${fmt.dateLong(booking.slotStart)} at ${fmt.time(booking.slotStart)}`

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button
        size={size}
        disabled={busy}
        onClick={() => (booking.mode === "online" ? setDialog("zoom") : doApprove())}
      >
        <CheckIcon strokeWidth={2.6} aria-hidden="true" /> Approve
      </Button>
      <Button size={size} variant="outline" disabled={busy} onClick={() => setDialog("decline")}>
        <XIcon aria-hidden="true" /> Decline
      </Button>

      <ConfirmDialog
        open={dialog === "zoom"}
        onOpenChange={(o) => setDialog(o ? "zoom" : null)}
        title={`Approve ${booking.visitor.fullName}'s online session`}
        description={`${when}. Paste the Zoom link to send with the confirmation email.`}
        confirmLabel="Approve and send link"
        pending={approve.isPending}
        confirmDisabled={!isZoomUrl(zoomLink)}
        onConfirm={() => doApprove(zoomLink.trim())}
      >
        <Field
          label="Zoom meeting link"
          error={zoomLink && !isZoomUrl(zoomLink) ? "Please paste the full link, starting with https://" : undefined}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="url"
              inputMode="url"
              placeholder="https://zoom.us/j/…"
              value={zoomLink}
              onChange={(e) => setZoomLink(e.target.value)}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "decline"}
        onOpenChange={(o) => setDialog(o ? "decline" : null)}
        tone="danger"
        title={`Decline ${firstName(booking)}'s request?`}
        description={`${when}. They'll get an email saying you couldn't take this request, with a link to choose another Thursday.`}
        confirmLabel="Decline request"
        cancelLabel="Keep request"
        pending={decline.isPending}
        onConfirm={doDecline}
      >
        <Field label={<>Add a personal message <span className="font-normal text-muted-foreground">(optional)</span></>}>
          {({ id }) => (
            <Textarea
              id={id}
              maxLength={LIMITS.declineMessageMax}
              className="min-h-24"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="For example: I'm away that week. Please book the following Thursday."
            />
          )}
        </Field>
      </ConfirmDialog>
    </div>
  )
}
