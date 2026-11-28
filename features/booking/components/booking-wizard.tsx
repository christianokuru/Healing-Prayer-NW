"use client"

import { ArrowLeftIcon, ArrowRightIcon, InfoIcon, Loader2Icon } from "lucide-react"
import { useEffect, useReducer, useRef, useState } from "react"
import { toast } from "sonner"

import { ErrorState } from "@/components/common/feedback"
import { Surface } from "@/components/common/surface"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useScrollTo } from "@/hooks/use-scroll-to"
import { errorMessage, isApiError } from "@/lib/api/errors"
import { fmt, keyLabel } from "@/lib/domain/time"

import { clearDraft, loadDraft } from "../draft"
import { useAvailability, useCreateBooking } from "../hooks"
import { STEPS, lostChoice, wizardReducer, type BookingDetails, type Lost } from "../state"
import { BookingSuccess } from "./booking-success"
import { DayPicker } from "./day-picker"
import { DETAILS_FORM_ID, DetailsForm } from "./details-form"
import { ReviewStep } from "./review-step"
import { TimePicker } from "./time-picker"
import { WizardStepper } from "./wizard-stepper"

const STEP_TITLES = {
  day: { title: "1. Choose a Thursday", sub: "You can book from 48 hours to one month ahead." },
  time: { title: "2. Choose a time", sub: "All times are Calgary time." },
  details: { title: "3. Your details", sub: "So we can confirm your session by email." },
  review: { title: "4. Check and send", sub: "Make sure everything looks right." },
  done: { title: "", sub: "" },
}

/** The public booking flow: Thursday → time → details → review. No account needed. */
export function BookingWizard() {
  const [state, dispatch] = useReducer(wizardReducer, { step: "day" })
  // Keep checking which times are free until they've sent their request.
  const availability = useAvailability({ poll: state.step !== "done" })
  const create = useCreateBooking()

  const [agreed, setAgreed] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  const scrollTo = useScrollTo(-88)
  const firstRender = useRef(true)

  useEffect(() => {
    // Don't jump on first load; do keep each new step in view.
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    scrollTo(topRef.current)
  }, [state.step, scrollTo])

  const day = availability.data?.find((d) => d.date === state.date)
  const slot = day?.slots.find((s) => s.start === state.slotStart)
  // Someone else may book their time while they're still filling in the form.
  const lost =
    state.step === "day" || create.isPending ? null : lostChoice(availability.data, state.date, state.slotStart)

  if (state.step === "done" && state.result) {
    return (
      <div ref={topRef}>
        <BookingSuccess result={state.result} />
      </div>
    )
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
    if (!state.slotStart || !state.details) return
    const d = state.details
    create.mutate(
      {
        slotStart: state.slotStart,
        fullName: d.fullName,
        email: d.email,
        phone: d.phone,
        prayerPoints: d.prayerPoints,
        online: d.online,
        onlineReason: d.online ? d.onlineReason : undefined,
        website: d.website,
      },
      {
        onSuccess: (result) => {
          clearDraft()
          dispatch({ type: "done", result })
        },
        onError,
      }
    )
  }

  const canContinue =
    (state.step === "day" && day?.state === "open") ||
    (state.step === "time" && slot?.state === "open") ||
    state.step === "details" ||
    (state.step === "review" && !lost)

  const onContinue = () => {
    if (state.step === "review") submit()
    else if (state.step !== "details") dispatch({ type: "next" })
  }

  const onDetails = (details: BookingDetails) => {
    setAgreed(true)
    dispatch({ type: "saveDetails", details })
    dispatch({ type: "next" })
  }

  const heading = STEP_TITLES[state.step]
  const submitting = create.isPending

  return (
    <div ref={topRef} className="scroll-mt-24">
      <WizardStepper steps={STEPS} current={state.step} />

      <Surface className="p-5 md:p-8">
        <h2 className="text-[22px] font-semibold">{heading.title}</h2>
        <p className="mt-1 mb-6 text-base text-[#4a5d56]">
          {state.step === "time" && state.date ? `${keyLabel(state.date)} · ${heading.sub}` : heading.sub}
        </p>

        {lost && state.date && (
          <LostChoiceNotice
            lost={lost}
            date={state.date}
            slotStart={state.slotStart}
            onChoose={state.step === "time" && lost === "slot" ? undefined : () => dispatch({ type: "slotLost", resetDate: lost === "day" })}
          />
        )}

        {availability.isError && <ErrorState error={availability.error} onRetry={() => availability.refetch()} />}

        {state.step === "day" &&
          (availability.data ? (
            <>
              <DayPicker
                days={availability.data}
                selected={state.date}
                onSelect={(date) => dispatch({ type: "pickDate", date })}
              />
              {!availability.data.some((d) => d.state === "open") && (
                <p className="mt-5 rounded-2xl bg-warning-soft px-4 py-3 text-[15px] text-warning-foreground">
                  Every Thursday in the next month is full or unavailable right now. New Thursdays open each week, so
                  please check back soon.
                </p>
              )}
            </>
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
            selected={slot?.state === "open" ? state.slotStart : undefined}
            onSelect={(slotStart) => dispatch({ type: "pickSlot", slotStart })}
          />
        )}

        {state.step === "details" && (
          <DetailsForm initial={state.details ?? loadDraft() ?? undefined} agreed={agreed} onSubmit={onDetails} />
        )}

        {state.step === "review" && state.slotStart && state.details && (
          <ReviewStep
            slotStart={state.slotStart}
            details={state.details}
            onEdit={(step) => dispatch({ type: "goTo", step })}
          />
        )}

        <div className="mt-8 flex flex-col-reverse gap-2.5 border-t border-border pt-6 sm:flex-row sm:justify-between">
          {state.step !== "day" ? (
            <Button variant="outline" size="lg" disabled={submitting} onClick={() => dispatch({ type: "back" })}>
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
            {state.step === "review" ? (submitting ? "Sending…" : "Send my request") : "Continue"}
            {state.step !== "review" && <ArrowRightIcon aria-hidden="true" />}
          </Button>
        </div>
      </Surface>
    </div>
  )
}

/** A gentle heads-up when their chosen time was taken by someone else meanwhile. */
function LostChoiceNotice({
  lost,
  date,
  slotStart,
  onChoose,
}: {
  lost: Exclude<Lost, null>
  date: string
  slotStart?: string
  onChoose?: () => void
}) {
  const time = slotStart ? fmt.time(slotStart) : "that time"
  const message =
    lost === "day"
      ? `Sorry, ${keyLabel(date)} is no longer available. Please choose another Thursday.`
      : `Sorry, someone has just booked ${time} on ${keyLabel(date)}. Please choose another time.` +
        (onChoose ? "" : " The times still open are shown below.")
  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-2xl bg-warning-soft px-4 py-3.5 text-[15px] text-warning-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex gap-2.5">
        <InfoIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </p>
      {onChoose && (
        <Button variant="outline" className="shrink-0 bg-card" onClick={onChoose}>
          {lost === "day" ? "Choose another Thursday" : "Choose another time"}
        </Button>
      )}
    </div>
  )
}
