"use client"

import { ArrowLeftIcon, ArrowRightIcon, CalendarX2Icon, Loader2Icon } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useReducer, useRef, useState } from "react"
import { toast } from "sonner"

import { EmptyState, ErrorState } from "@/components/common/feedback"
import { PageHeader } from "@/components/common/page-header"
import { Surface } from "@/components/common/surface"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@/features/auth/hooks"
import { useAvailability, useCreateBooking, useMyBookings, useRequestReschedule } from "@/features/visitor/hooks"
import { useNow } from "@/hooks/use-now"
import { useScrollTo } from "@/hooks/use-scroll-to"
import { errorMessage, isApiError } from "@/lib/api/errors"
import { canChangeThemselves, hasPendingReschedule } from "@/lib/domain/booking-rules"
import { fmt, keyLabel } from "@/lib/domain/time"
import type { Booking } from "@/lib/domain/types"

import { clearDraft, loadDraft } from "../draft"
import { stepsFor, wizardReducer, type BookingDetails } from "../state"
import { BookingSuccess } from "./booking-success"
import { DayPicker } from "./day-picker"
import { DETAILS_FORM_ID, DetailsForm } from "./details-form"
import { ReviewStep } from "./review-step"
import { TimePicker } from "./time-picker"
import { WizardStepper } from "./wizard-stepper"

const STEP_TITLES = {
  day: { title: "Choose a Thursday", sub: "You can book from 48 hours to one month ahead, one session per Thursday." },
  time: { title: "Choose a time", sub: "All times are Calgary time." },
  details: { title: "Your prayer points", sub: "This helps the prayer ministers prepare." },
  review: { title: "Review your request", sub: "Check everything looks right." },
  done: { title: "", sub: "" },
}

export function BookingWizard() {
  const rescheduleId = useSearchParams().get("reschedule") ?? undefined
  const user = useUser()
  const now = useNow()
  const myBookings = useMyBookings()
  const availability = useAvailability(rescheduleId)
  const create = useCreateBooking()
  const reschedule = useRequestReschedule()

  const steps = stepsFor(!!rescheduleId)
  const [state, dispatch] = useReducer(wizardReducer, { step: "day" })
  const [draft] = useState(() => (typeof window === "undefined" ? null : loadDraft()))
  const [agreed, setAgreed] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  const scrollTo = useScrollTo()

  useEffect(() => scrollTo(topRef.current), [state.step, scrollTo])

  const original: Booking | undefined = rescheduleId ? myBookings.data?.find((b) => b.id === rescheduleId) : undefined
  const day = availability.data?.find((d) => d.date === state.date)
  const slot = day?.slots.find((s) => s.start === state.slotStart)
  const submitting = create.isPending || reschedule.isPending

  if (state.step === "done" && state.result) {
    return (
      <div ref={topRef}>
        <BookingSuccess booking={state.result} rescheduled={!!rescheduleId} />
      </div>
    )
  }

  if (rescheduleId && myBookings.data) {
    const movable =
      original &&
      !original.rescheduleOfId &&
      canChangeThemselves(original, now) &&
      !hasPendingReschedule(original, myBookings.data)
    if (!movable) {
      return (
        <Surface>
          <EmptyState
            icon={CalendarX2Icon}
            title="This session can't be moved online"
            description="It may be less than 48 hours away, already changed, or no longer active. Please contact the prayer minister if you need help."
            action={
              <Button nativeButton={false} render={<Link href="/dashboard/sessions" />}>
                Back to my sessions
              </Button>
            }
          />
        </Surface>
      )
    }
  }

  const onError = (e: unknown) => {
    toast.error(errorMessage(e))
    if (isApiError(e)) {
      if (e.code === "slot_taken") dispatch({ type: "slotLost" })
      if (["one_per_thursday", "date_unavailable", "outside_window"].includes(e.code)) {
        dispatch({ type: "slotLost", resetDate: true })
      }
    }
    availability.refetch()
  }

  const submit = () => {
    if (!state.slotStart) return
    const onSuccess = (result: Booking) => {
      clearDraft()
      dispatch({ type: "done", result })
    }
    if (rescheduleId) {
      reschedule.mutate({ bookingId: rescheduleId, slotStart: state.slotStart }, { onSuccess, onError })
    } else if (state.details) {
      const d = state.details
      create.mutate(
        {
          slotStart: state.slotStart,
          mode: d.mode,
          topic: d.topic,
          prayerPoints: d.prayerPoints,
          onlineReason: d.mode === "online" ? d.onlineReason : undefined,
        },
        { onSuccess, onError }
      )
    }
  }

  const canContinue =
    (state.step === "day" && day?.state === "open") ||
    (state.step === "time" && slot?.state === "open" && state.slotStart !== original?.slotStart) ||
    state.step === "details" ||
    state.step === "review"

  const onContinue = () => {
    if (state.step === "review") submit()
    else if (state.step !== "details") dispatch({ type: "next", steps })
  }

  const onDetails = (details: BookingDetails) => {
    setAgreed(true)
    dispatch({ type: "saveDetails", details })
    dispatch({ type: "next", steps })
  }

  const heading = STEP_TITLES[state.step]

  return (
    <div ref={topRef} className="mx-auto max-w-4xl animate-rise">
      <Button
        nativeButton={false}
        render={<Link href={rescheduleId ? "/dashboard/sessions" : "/dashboard"} />}
        variant="ghost"
        className="-ml-3 mb-2"
      >
        <ArrowLeftIcon aria-hidden="true" /> {rescheduleId ? "Back to my sessions" : "Back to home"}
      </Button>
      <PageHeader
        title={rescheduleId ? "Choose a new time" : "Book a prayer session"}
        description={
          rescheduleId && original
            ? `Moving your session on ${fmt.dateLong(original.slotStart)} at ${fmt.time(original.slotStart)}.`
            : "Free · 30 minutes · Thursday evenings at Alberta Bible College"
        }
        className="md:mb-6"
      />
      <WizardStepper steps={steps} current={state.step} />

      <Surface className="p-5 md:p-8">
        <h2 className="text-[22px] font-semibold">{heading.title}</h2>
        <p className="mt-1 mb-6 text-[15px] text-[#4a5d56]">
          {state.step === "time" && state.date ? `${keyLabel(state.date)} · ${heading.sub}` : heading.sub}
        </p>

        {availability.isError && <ErrorState error={availability.error} onRetry={() => availability.refetch()} />}

        {state.step === "day" &&
          (availability.data && myBookings.data ? (
            availability.data.some((d) => d.state === "open") ? (
              <DayPicker
                days={availability.data}
                myBookings={myBookings.data}
                selected={state.date}
                onSelect={(date) => dispatch({ type: "pickDate", date })}
              />
            ) : (
              <>
                <DayPicker days={availability.data} myBookings={myBookings.data} onSelect={() => {}} />
                <p className="mt-5 rounded-2xl bg-warning-soft px-4 py-3 text-[15px] text-warning-foreground">
                  Every Thursday in the next month is full or unavailable right now. New Thursdays open each week, so
                  please check back soon.
                </p>
              </>
            )
          ) : (
            !availability.isError && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-[148px] rounded-2xl" />
                ))}
              </div>
            )
          ))}

        {state.step === "time" && day && (
          <TimePicker
            slots={day.slots}
            selected={state.slotStart}
            currentStart={original?.slotStart}
            onSelect={(slotStart) => dispatch({ type: "pickSlot", slotStart })}
          />
        )}

        {state.step === "details" && (
          <DetailsForm user={user} initial={state.details ?? draft ?? undefined} agreed={agreed} onSubmit={onDetails} />
        )}

        {state.step === "review" && state.slotStart && (
          <ReviewStep
            slotStart={state.slotStart}
            details={rescheduleId ? undefined : state.details}
            original={original}
            onEdit={(step) => dispatch({ type: "goTo", step })}
          />
        )}

        <div className="mt-8 flex flex-col-reverse gap-2.5 border-t border-border pt-6 sm:flex-row sm:justify-between">
          {state.step !== "day" ? (
            <Button variant="outline" size="lg" disabled={submitting} onClick={() => dispatch({ type: "back", steps })}>
              <ArrowLeftIcon aria-hidden="true" /> Back
            </Button>
          ) : (
            <span />
          )}
          <Button
            size="lg"
            className="sm:min-w-52"
            type={state.step === "details" ? "submit" : "button"}
            form={state.step === "details" ? DETAILS_FORM_ID : undefined}
            disabled={!canContinue || submitting}
            onClick={state.step === "details" ? undefined : onContinue}
          >
            {submitting && <Loader2Icon className="animate-spin" aria-hidden="true" />}
            {state.step === "review"
              ? submitting
                ? "Sending…"
                : rescheduleId
                  ? "Request this new time"
                  : "Send my request"
              : "Continue"}
            {state.step !== "review" && <ArrowRightIcon aria-hidden="true" />}
          </Button>
        </div>
      </Surface>
    </div>
  )
}
