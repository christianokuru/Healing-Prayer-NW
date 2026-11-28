"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "cn"
import { VideoIcon } from "lucide-react"
import Link from "next/link"
import { useEffect, useId } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"

import { Field, TextField } from "@/components/forms/field"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { LIMITS } from "@/lib/config/ministry"

import { saveDraft } from "../draft"
import { detailsSchema, type DetailsValues } from "../schema"
import type { BookingDetails } from "../state"

export const DETAILS_FORM_ID = "booking-details"

interface DetailsFormProps {
  initial?: Partial<BookingDetails>
  agreed?: boolean
  onSubmit: (details: BookingDetails) => void
}

/** A tick box with its text as the accessible name (Base UI's checkbox isn't a native input). */
function CheckRow({
  checked,
  onChange,
  invalid,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  invalid?: boolean
  children: React.ReactNode
}) {
  const labelId = useId()
  return (
    <label className="flex cursor-pointer items-start gap-3 text-base leading-relaxed">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(!!v)}
        aria-invalid={invalid || undefined}
        aria-labelledby={labelId}
        className="mt-1 size-5"
      />
      <span id={labelId}>{children}</span>
    </label>
  )
}

/** The whole form: name, email, phone, prayer points, and an optional Zoom request. */
export function DetailsForm({ initial, agreed, onSubmit }: DetailsFormProps) {
  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      fullName: initial?.fullName ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      prayerPoints: initial?.prayerPoints ?? "",
      online: initial?.online ?? false,
      onlineReason: initial?.onlineReason ?? "",
      website: "",
      agree: !!agreed,
    },
  })
  const { errors } = form.formState
  const [fullName, email, phone, points, online, onlineReason] = useWatch({
    control: form.control,
    name: ["fullName", "email", "phone", "prayerPoints", "online", "onlineReason"],
  })

  // Kept in this tab only, so nothing typed is lost if the page reloads.
  useEffect(() => {
    saveDraft({ fullName, email, phone, prayerPoints: points, online, onlineReason })
  }, [fullName, email, phone, points, online, onlineReason])

  return (
    <form
      id={DETAILS_FORM_ID}
      noValidate
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit(({ agree: _agree, ...details }) => onSubmit(details))}
    >
      <TextField
        label="Full name"
        autoComplete="name"
        error={errors.fullName?.message}
        {...form.register("fullName")}
      />
      <TextField
        label="Email address"
        type="email"
        inputMode="email"
        autoComplete="email"
        hint="We'll email you when your session is confirmed, so please check it carefully."
        error={errors.email?.message}
        {...form.register("email")}
      />
      <TextField
        label="Phone number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        hint="In case we need to reach you about your session."
        error={errors.phone?.message}
        {...form.register("phone")}
      />

      <Field
        label="What would you like prayer for?"
        hint="Share briefly. You'll be able to talk more with the prayer ministers in person."
        error={errors.prayerPoints?.message}
      >
        {({ id, describedBy, invalid }) => (
          <div>
            <Textarea
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              maxLength={LIMITS.prayerPointsMax}
              rows={5}
              placeholder="For example: healing from back pain, and peace for my family."
              {...form.register("prayerPoints")}
            />
            <p
              className={cn(
                "mt-1.5 text-right text-[13px] text-muted-foreground tabular",
                points.length >= LIMITS.prayerPointsMax - 40 && "font-semibold text-warning-foreground"
              )}
            >
              {points.length} / {LIMITS.prayerPointsMax}
            </p>
          </div>
        )}
      </Field>

      {/* Hidden from people (and screen readers); bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" {...form.register("website")} />
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-muted/60 p-4">
        <Controller
          control={form.control}
          name="online"
          render={({ field }) => (
            <CheckRow checked={field.value} onChange={field.onChange}>
              <span className="flex items-center gap-2 font-semibold">
                <VideoIcon className="size-[18px] text-info" aria-hidden="true" />
                I can&apos;t come in person. Please join me by Zoom.
              </span>
              <span className="block text-sm text-muted-foreground">
                For anyone too unwell to travel. Most sessions are in person at Alberta Bible College.
              </span>
            </CheckRow>
          )}
        />
        {online && (
          <Field
            label="Why can't you come in person?"
            hint="A few words is enough, for example “in treatment and unable to travel”."
            error={errors.onlineReason?.message}
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                maxLength={LIMITS.onlineReasonMax}
                className="min-h-20 bg-card"
                {...form.register("onlineReason")}
              />
            )}
          </Field>
        )}
      </div>

      <Controller
        control={form.control}
        name="agree"
        render={({ field }) => (
          <div className="flex flex-col gap-1.5">
            <CheckRow checked={field.value} onChange={field.onChange} invalid={!!errors.agree}>
              I have read the{" "}
              <Link href="/privacy" target="_blank" className="font-semibold text-primary-strong underline">
                privacy notice
              </Link>
              , and I understand that prayer is not a replacement for medical care.
            </CheckRow>
            {errors.agree && (
              <p role="alert" className="text-sm font-medium text-danger-foreground">
                {errors.agree.message}
              </p>
            )}
          </div>
        )}
      />
    </form>
  )
}
