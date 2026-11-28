import { CalendarPlusIcon, CheckIcon, MailIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { isMockApi } from "@/lib/api"
import type { CreatedBooking } from "@/lib/api/contracts"
import { downloadText, sessionIcs } from "@/lib/files"
import { fmt } from "@/lib/domain/time"
import { managePath } from "@/lib/manage-link"

const NEXT_STEPS = [
  { text: "The prayer minister reviews your request.", tone: "bg-warning-soft text-warning-foreground" },
  {
    text: "You get an email when it's confirmed. If you don't see it, please check your spam or junk folder.",
    tone: "bg-primary-soft text-primary-strong",
  },
  { text: "We'll send a reminder the day before your session.", tone: "bg-info-soft text-info-foreground" },
]

export function BookingSuccess({ result }: { result: CreatedBooking }) {
  const { booking, manageToken } = result
  return (
    <div className="animate-rise rounded-[24px] border border-border bg-card px-5 py-10 text-center md:px-10 md:py-14">
      <span className="mx-auto mb-5 flex size-[72px] items-center justify-center rounded-full bg-primary-soft text-primary-strong">
        <CheckIcon className="size-9" strokeWidth={2.4} aria-hidden="true" />
      </span>
      <h1 className="font-heading text-[32px] leading-tight font-medium md:text-[38px]">Your request has been sent</h1>
      <p className="mx-auto mt-3 max-w-md text-[17px] text-[#44564f]">
        {fmt.dateLong(booking.slotStart)} at {fmt.time(booking.slotStart)} is held for you, {booking.fullName.split(" ")[0]}.
      </p>
      <p className="mx-auto mt-4 flex max-w-md items-start justify-center gap-2 rounded-2xl bg-surface-muted px-4 py-3 text-left text-[15px] text-[#3f524b]">
        <MailIcon className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
        <span>
          We&apos;ve emailed <strong className="text-foreground">{booking.email}</strong> with a link to view or cancel
          your booking. Keep that email safe.
        </span>
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
        <Button nativeButton={false} render={<Link href={managePath(manageToken)} />} size="lg">
          View my booking
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() =>
            downloadText(
              "prayer-session.ics",
              sessionIcs({ id: booking.id, start: booking.slotStart, online: booking.mode === "online" }),
              "text/calendar"
            )
          }
        >
          <CalendarPlusIcon aria-hidden="true" /> Add to my calendar
        </Button>
      </div>
      {isMockApi && (
        <p className="mx-auto mt-6 max-w-md text-[13px] text-muted-foreground">
          Demo mode: no email is really sent. Use “View my booking” to see the page the email link opens.
        </p>
      )}
    </div>
  )
}
