"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"

import { FormError, PasswordField, TextField } from "@/components/forms/field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Checkbox } from "@/components/ui/checkbox"
import { errorMessage } from "@/lib/api/errors"
import { LIMITS } from "@/lib/config/ministry"

import { useSignup } from "../hooks"
import { signupSchema, type SignupValues } from "../schemas"

export function SignupForm() {
  const router = useRouter()
  const signup = useSignup()
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", confirmPassword: "", agree: false },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(({ confirmPassword: _c, agree: _a, ...values }) =>
    signup.mutate(values, {
      onSuccess: ({ email }) => router.push(`/verify-email?email=${encodeURIComponent(email)}`),
    })
  )

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormError message={signup.isError ? errorMessage(signup.error) : null} />
        <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...form.register("fullName")} />
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          hint="We'll send your booking updates here."
          error={errors.email?.message}
          {...form.register("email")}
        />
        <TextField
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(403) 555-0123"
          error={errors.phone?.message}
          {...form.register("phone")}
        />
        <PasswordField
          label="Create a password"
          autoComplete="new-password"
          hint={`At least ${LIMITS.passwordMin} characters.`}
          error={errors.password?.message}
          {...form.register("password")}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...form.register("confirmPassword")}
        />
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
                  I agree to the{" "}
                  <Link href="/privacy" className="font-semibold text-primary-strong underline">
                    privacy notice
                  </Link>{" "}
                  and understand prayer sessions are not a substitute for medical care.
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
        <SubmitButton pending={signup.isPending} pendingLabel="Creating your account…" className="mt-1">
          Create account
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-[15px] text-[#44564f]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary-strong hover:underline">
          Log in
        </Link>
      </p>
    </>
  )
}
