"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { MailCheckIcon } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormError, TextField } from "@/components/forms/field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { isMockApi } from "@/lib/api"
import { errorMessage } from "@/lib/api/errors"
import { MOCK_VERIFICATION_CODE } from "@/lib/api/mock"

import { useResendVerification, useVerifyEmail } from "../hooks"
import { verifySchema, type VerifyValues } from "../schemas"
import { AuthHeading } from "./auth-shell"

const RESEND_SECONDS = 30

export function VerifyEmailForm() {
  const router = useRouter()
  const email = useSearchParams().get("email") ?? ""
  const verify = useVerifyEmail()
  const resend = useResendVerification()
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)
  const form = useForm<VerifyValues>({ resolver: zodResolver(verifySchema), defaultValues: { code: "" } })

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  if (!email) {
    return (
      <>
        <AuthHeading title="Check your email" description="We need to know which email to confirm." />
        <Button nativeButton={false} render={<Link href="/signup" />} size="lg" className="w-full">
          Back to sign up
        </Button>
      </>
    )
  }

  const onSubmit = form.handleSubmit(({ code }) =>
    verify.mutate(
      { email, code },
      {
        onSuccess: (user) => {
          toast.success(`Welcome, ${user.fullName.split(" ")[0]}! Your account is ready.`)
          router.replace("/dashboard")
        },
      }
    )
  )

  return (
    <>
      <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
        <MailCheckIcon className="size-7" aria-hidden="true" />
      </span>
      <AuthHeading
        title="Confirm your email"
        description={
          <>
            We sent a 6-digit code to <strong className="text-foreground">{email}</strong>. Enter it below to finish
            creating your account.
          </>
        }
      />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormError message={verify.isError ? errorMessage(verify.error) : null} />
        <TextField
          label="Confirmation code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          className="[&_input]:h-14 [&_input]:text-center [&_input]:text-2xl [&_input]:tracking-[0.5em]"
          hint={isMockApi ? `Demo mode: the code is ${MOCK_VERIFICATION_CODE}.` : "It can take a minute to arrive. Check your spam folder too."}
          error={form.formState.errors.code?.message}
          {...form.register("code")}
        />
        <SubmitButton pending={verify.isPending} pendingLabel="Confirming…">
          Confirm email
        </SubmitButton>
      </form>
      <div className="mt-6 text-center text-[15px] text-[#44564f]">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          disabled={cooldown > 0 || resend.isPending}
          onClick={() =>
            resend.mutate(email, {
              onSuccess: () => {
                toast.success("We've sent a new code.")
                setCooldown(RESEND_SECONDS)
              },
              onError: (e) => toast.error(errorMessage(e)),
            })
          }
          className="font-semibold text-primary-strong hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {cooldown > 0 ? `Send again in ${cooldown}s` : "Send a new code"}
        </button>
      </div>
    </>
  )
}
