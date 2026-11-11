import { CheckIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { fmt } from "@/lib/domain/time"
import type { Booking } from "@/lib/domain/types"

const NEXT_STEPS = [
  { text: "The prayer minister reviews your request.", tone: "bg-warning-soft text-warning-foreground" },
  { text: "You get an email when it's confirmed. Please check your spam folder too.", tone: "bg-primary-soft text-primary-strong" },
  { text: "We'll send a reminder the day before your session.", tone: "bg-info-soft text-info-foreground" },
]

export function BookingSuccess({ booking, rescheduled }: { booking: Booking; rescheduled: boolean }) {
  return (
    <div className="animate-rise rounded-[24px] border border-border bg-card px-5 py-10 text-center md:px-10 md:py-14">
      <span className="mx-auto mb-5 flex size-[72px] items-center justify-center rounded-full bg-primary-soft text-primary-strong">
        <CheckIcon className="size-9" strokeWidth={2.4} aria-hidden="true" />
      </span>
      <h1 className="font-heading text-[32px] leading-tight font-medium md:text-[38px]">
        {rescheduled ? "Your new time has been requested" : "Your request has been sent"}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[17px] text-[#44564f]">
        {fmt.dateLong(booking.slotStart)} at {fmt.time(booking.slotStart)} is held for you. Here&apos;s what happens next.
      </p>
      <ol className="mx-auto mt-8 flex max-w-md flex-col gap-3.5 text-left">
        {NEXT_STEPS.map((s, i) => (
          <li key={s.text} className="flex items-start gap-3.5">
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.tone}`}>
              {i + 1}
            </span>
            <span className="pt-1">{s.text}</span>
          </li>
        ))}
      </ol>
      <div className="mt-9 flex flex-col justify-center gap-2.5 sm:flex-row">
        <Button nativeButton={false} render={<Link href="/dashboard" />} size="lg">
          Go to my dashboard
        </Button>
        <Button nativeButton={false} render={<Link href="/dashboard/sessions" />} size="lg" variant="outline">
          View my sessions
        </Button>
      </div>
    </div>
  )
}
