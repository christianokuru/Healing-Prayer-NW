"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon, MailIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { FormError, TextField } from "@/components/forms/field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { isMockApi } from "@/lib/api"
import { errorMessage } from "@/lib/api/errors"

import { useRequestPasswordReset } from "../hooks"
import { forgotSchema, type ForgotValues } from "../schemas"
import { AuthHeading } from "./auth-shell"

export function ForgotPasswordForm() {
  const request = useRequestPasswordReset()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } })

  const onSubmit = form.handleSubmit(({ email }) =>
    request.mutate(email, { onSuccess: () => setSentTo(email.trim().toLowerCase()) })
  )

  if (sentTo) {
    return (
      <>
        <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
          <MailIcon className="size-7" aria-hidden="true" />
        </span>
        <AuthHeading
          title="Check your email"
          description={
            <>
              If there&apos;s an account for <strong className="text-foreground">{sentTo}</strong>, we&apos;ve sent a link
              to reset your password. It may take a minute to arrive.
            </>
          }
        />
        {isMockApi && (
          <Button
            nativeButton={false}
            render={<Link href={`/reset-password?token=${encodeURIComponent(`reset-${sentTo}`)}`} />}
            size="lg"
            className="mb-3 w-full"
          >
            Open the reset link (demo)
          </Button>
        )}
        <Button nativeButton={false} render={<Link href="/login" />} variant="outline" size="lg" className="w-full">
          Back to log in
        </Button>
      </>
    )
  }

  return (
    <>
      <AuthHeading
        title="Forgot your password?"
        description="Enter the email you signed up with and we'll send you a link to choose a new one."
      />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormError message={request.isError ? errorMessage(request.error) : null} />
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />
        <SubmitButton pending={request.isPending} pendingLabel="Sending…">
          Send reset link
        </SubmitButton>
      </form>
      <Link
        href="/login"
        className="mx-auto mt-6 flex items-center gap-2 text-[15px] font-semibold text-primary-strong hover:underline"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" /> Back to log in
      </Link>
    </>
  )
}
