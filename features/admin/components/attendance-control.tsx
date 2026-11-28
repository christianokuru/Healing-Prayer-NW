"use client"

import { cn } from "cn"
import { CheckIcon, UserXIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/api/errors"
import type { AdminBooking, Attendance } from "@/lib/domain/types"

import { useSetAttendance } from "../hooks"
import { FollowUpButton } from "./follow-up-dialog"

const firstName = (b: AdminBooking) => b.visitor.fullName.split(" ")[0]

const currentOf = (b: AdminBooking): Attendance | null =>
  b.status === "attended" || b.status === "no_show" ? b.status : null

const MESSAGES: Record<Attendance | "cleared", (name: string) => string> = {
  attended: (name) => `Marked ${name} as came.`,
  no_show: (name) => `Marked ${name} as didn't come. You can email them to check in.`,
  cleared: (name) => `Cleared attendance for ${name}.`,
}

/**
 * Recording attendance, with an Undo on every change.
 * Toasts are fired from the promise (not the mutation callbacks) because the
 * row often unmounts as soon as the optimistic update lands.
 */
export function useAttendanceActions() {
  const setAttendance = useSetAttendance()

  const mark = (booking: AdminBooking, attendance: Attendance | null) => {
    const previous = currentOf(booking)
    return setAttendance.mutateAsync({ bookingId: booking.id, attendance }).then(
      () =>
        toast.success(MESSAGES[attendance ?? "cleared"](firstName(booking)), {
          action: {
            label: "Undo",
            onClick: () => setAttendance.mutate({ bookingId: booking.id, attendance: previous }),
          },
        }),
      (e) => toast.error(errorMessage(e))
    )
  }

  const markAllCame = (bookings: AdminBooking[]) =>
    Promise.all(bookings.map((b) => setAttendance.mutateAsync({ bookingId: b.id, attendance: "attended" }))).then(
      () =>
        toast.success(`Marked ${bookings.length === 1 ? firstName(bookings[0]) : `all ${bookings.length}`} as came.`, {
          action: {
            label: "Undo",
            onClick: () => bookings.forEach((b) => setAttendance.mutate({ bookingId: b.id, attendance: null })),
          },
        }),
      (e) => toast.error(errorMessage(e))
    )

  return { mark, markAllCame }
}

interface AttendanceControlProps {
  booking: AdminBooking
  className?: string
}

/**
 * "Came / Didn't come" toggle. Tapping the selected answer again clears it.
 * Once someone is marked as didn't come, the minister can email them from here.
 */
export function AttendanceControl({ booking, className }: AttendanceControlProps) {
  const { mark } = useAttendanceActions()
  const current = currentOf(booking)
  const name = booking.visitor.fullName
  const choose = (value: Attendance) => mark(booking, current === value ? null : value)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
    <div role="group" aria-label={`Did ${name} come?`} className="flex gap-2">
      <Button
        size="sm"
        variant={current === "attended" ? "default" : "outline"}
        aria-pressed={current === "attended"}
        className="flex-1 sm:flex-none"
        onClick={() => choose("attended")}
      >
        <CheckIcon aria-hidden="true" /> Came
      </Button>
      <Button
        size="sm"
        variant="outline"
        aria-pressed={current === "no_show"}
        className={cn(
          "flex-1 sm:flex-none",
          current === "no_show" && "border-danger-foreground/40 bg-danger-soft text-danger-foreground hover:bg-danger-soft"
        )}
        onClick={() => choose("no_show")}
      >
        <UserXIcon aria-hidden="true" /> Didn&apos;t come
      </Button>
    </div>
    {current === "no_show" && <FollowUpButton booking={booking} />}
    </div>
  )
}
