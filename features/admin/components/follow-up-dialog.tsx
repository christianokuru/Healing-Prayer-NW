"use client"

import { cn } from "cn"
import { MailCheckIcon, MailIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/features/auth/hooks"
import { errorMessage } from "@/lib/api/errors"
import { LIMITS } from "@/lib/config/ministry"
import { fmt } from "@/lib/domain/time"
import type { AdminBooking } from "@/lib/domain/types"

import { useSendFollowUp } from "../hooks"

const firstName = (name: string) => name.split(" ")[0]

/** A kind starting point the minister can rewrite before sending. */
export function followUpDraft(booking: AdminBooking, signOff: string) {
  const site = typeof window === "undefined" ? "" : window.location.origin
  return {
    subject: "We missed you on Thursday",
    message: [
      `Hello ${firstName(booking.visitor.fullName)},`,
      "",
      `We missed you at your prayer session on ${fmt.dateLong(booking.slotStart)} at ${fmt.time(booking.slotStart)}, and we hope you're well.`,
      "",
      "Is everything all right? If anything kept you away, we'd be glad to hear from you. You're always welcome to book another Thursday whenever you're ready" +
        (site ? `: ${site}` : "."),
      "",
      "With love and prayers,",
      signOff,
    ].join("\n"),
  }
}

interface FollowUpDialogProps {
  booking: AdminBooking
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Compose and send a personal email to someone who didn't come. */
export function FollowUpDialog({ booking, open, onOpenChange }: FollowUpDialogProps) {
  const user = useUser()
  const send = useSendFollowUp()
  const [draft, setDraft] = useState(() => followUpDraft(booking, firstName(user.fullName)))
  const name = firstName(booking.visitor.fullName)
  const ready = draft.subject.trim().length > 0 && draft.message.trim().length > 0

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Email ${name}`}
      description={
        <>
          To <strong className="text-foreground">{booking.visitor.email}</strong>. Replies come back to the
          ministry&apos;s email.
        </>
      }
      confirmLabel="Send email"
      cancelLabel="Not now"
      pending={send.isPending}
      confirmDisabled={!ready}
      onConfirm={() =>
        send
          .mutateAsync({ bookingId: booking.id, subject: draft.subject.trim(), message: draft.message.trim() })
          .then(
            () => {
              onOpenChange(false)
              toast.success(`Email sent to ${name}.`)
            },
            (e) => toast.error(errorMessage(e))
          )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`fu-subject-${booking.id}`} className="text-[15px] font-semibold">
            Subject
          </Label>
          <Input
            id={`fu-subject-${booking.id}`}
            value={draft.subject}
            maxLength={150}
            onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`fu-message-${booking.id}`} className="text-[15px] font-semibold">
            Message
          </Label>
          <Textarea
            id={`fu-message-${booking.id}`}
            value={draft.message}
            maxLength={LIMITS.followUpMax}
            rows={10}
            className="min-h-56"
            onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
          />
        </div>
      </div>
    </ConfirmDialog>
  )
}

/** "Email them" for a no-show; after sending, shows when it went and lets her send another. */
export function FollowUpButton({ booking, className }: { booking: AdminBooking; className?: string }) {
  const [open, setOpen] = useState(false)
  const sent = booking.followUpSentAt
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <Button size="sm" variant={sent ? "ghost" : "outline"} className={sent ? "-ml-3" : ""} onClick={() => setOpen(true)}>
        <MailIcon aria-hidden="true" /> {sent ? "Email again" : `Email ${firstName(booking.visitor.fullName)}`}
      </Button>
      {sent && (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <MailCheckIcon className="size-4 text-primary" aria-hidden="true" />
          Emailed {fmt.dayMonth(sent)}
        </span>
      )}
      {/* Mounted only while open, so each time starts from a fresh draft. */}
      {open && <FollowUpDialog booking={booking} open={open} onOpenChange={setOpen} />}
    </div>
  )
}
