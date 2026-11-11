"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "cn"
import { MapPinIcon, VideoIcon } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"

import { Field } from "@/components/forms/field"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { LIMITS } from "@/lib/config/ministry"
import { TOPICS } from "@/lib/domain/topics"
import type { User } from "@/lib/domain/types"

import { saveDraft } from "../draft"
import { detailsSchema, type DetailsValues } from "../schema"
import type { BookingDetails } from "../state"

export const DETAILS_FORM_ID = "booking-details"

interface DetailsFormProps {
  user: User
  initial?: Partial<BookingDetails>
  agreed?: boolean
  onSubmit: (details: BookingDetails) => void
}

const optionCard = (checked: boolean) =>
  cn(
    "flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
    checked ? "border-2 border-primary bg-primary-soft" : "border-input bg-card hover:border-primary"
  )

export function DetailsForm({ user, initial, agreed, onSubmit }: DetailsFormProps) {
  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      topic: initial?.topic,
      prayerPoints: initial?.prayerPoints ?? "",
      mode: initial?.mode ?? "in_person",
      onlineReason: initial?.onlineReason ?? "",
      agree: !!agreed,
    },
  })
  const { errors } = form.formState
  const [topic, mode, points, onlineReason] = useWatch({
    control: form.control,
    name: ["topic", "mode", "prayerPoints", "onlineReason"],
  })

  useEffect(() => {
    saveDraft({ topic, mode, prayerPoints: points, onlineReason })
  }, [topic, mode, points, onlineReason])

  return (
    <form
      id={DETAILS_FORM_ID}
      noValidate
      className="flex flex-col gap-7"
      onSubmit={form.handleSubmit(({ agree: _agree, ...details }) => onSubmit(details))}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[15px] font-semibold">What is your prayer mostly about?</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {TOPICS.map((t) => {
            const checked = topic === t.value
            return (
              <label key={t.value} className={optionCard(checked)}>
                <input type="radio" value={t.value} className="sr-only" {...form.register("topic")} />
                <span className={cn("font-semibold", checked && "text-primary-strong")}>{t.label}</span>
                <span className="text-[13px] leading-snug text-muted-foreground">{t.hint}</span>
              </label>
            )
          })}
        </div>
        {errors.topic && (
          <p role="alert" className="text-sm font-medium text-danger-foreground">
            {errors.topic.message}
          </p>
        )}
      </fieldset>

      <Field
        label="Your prayer points"
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
            <div className="mt-1.5 flex justify-between text-[13px] text-muted-foreground">
              <span>Please keep it short and focused.</span>
              <span className={cn("tabular", points.length >= LIMITS.prayerPointsMax - 40 && "font-semibold text-warning-foreground")}>
                {points.length} / {LIMITS.prayerPointsMax}
              </span>
            </div>
          </div>
        )}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[15px] font-semibold">How will you attend?</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className={optionCard(mode === "in_person")}>
            <input type="radio" value="in_person" className="sr-only" {...form.register("mode")} />
            <span className="flex items-center gap-2 font-semibold">
              <MapPinIcon className="size-[18px]" aria-hidden="true" /> In person
            </span>
            <span className="text-sm text-muted-foreground">At Alberta Bible College. This is how most sessions happen.</span>
          </label>
          <label className={optionCard(mode === "online")}>
            <input type="radio" value="online" className="sr-only" {...form.register("mode")} />
            <span className="flex items-center gap-2 font-semibold">
              <VideoIcon className="size-[18px]" aria-hidden="true" /> Online by Zoom
            </span>
            <span className="text-sm text-muted-foreground">
              For anyone who can&apos;t attend because of illness. The link is emailed after approval.
            </span>
          </label>
        </div>
      </fieldset>

      {mode === "online" && (
        <Field
          label="Why do you need to join online?"
          hint="A few words is enough, for example “in treatment and unable to travel”."
          error={errors.onlineReason?.message}
        >
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              maxLength={LIMITS.onlineReasonMax}
              className="min-h-20"
              {...form.register("onlineReason")}
            />
          )}
        </Field>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-2xl bg-surface-muted px-4 py-3.5 text-sm text-[#3f524b]">
        <span>
          We&apos;ll contact you at <strong className="text-foreground">{user.email}</strong> ·{" "}
          <strong className="text-foreground">{user.phone}</strong>
        </span>
        <Link href="/dashboard/profile" className="font-semibold text-primary-strong hover:underline">
          Update details
        </Link>
      </div>

      <Controller
        control={form.control}
        name="agree"
        render={({ field }) => (
          <div className="flex flex-col gap-1.5">
            <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed">
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(!!v)}
                aria-invalid={!!errors.agree || undefined}
                className="mt-0.5 size-5"
              />
              <span>
                I have read the{" "}
                <Link href="/privacy" className="font-semibold text-primary-strong underline">
                  privacy notice and booking terms
                </Link>
                , and I understand that prayer is not a replacement for medical care.
              </span>
            </label>
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
