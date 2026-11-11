"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormError, PasswordField } from "@/components/forms/field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/api/errors"
import { LIMITS } from "@/lib/config/ministry"

import { useResetPassword } from "../hooks"
import { resetSchema, type ResetValues } from "../schemas"
import { AuthHeading } from "./auth-shell"

export function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get("token")
  const reset = useResetPassword()
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })
  const { errors } = form.formState

  if (!token) {
    return (
      <>
        <AuthHeading
          title="This link isn't complete"
          description="Please use the full link from your email, or ask for a new one."
        />
        <Button nativeButton={false} render={<Link href="/forgot-password" />} size="lg" className="w-full">
          Request a new link
        </Button>
      </>
    )
  }

  const onSubmit = form.handleSubmit(({ password }) =>
    reset.mutate(
      { token, password },
      {
        onSuccess: () => {
          toast.success("Your password has been changed. Please log in.")
          router.replace("/login")
        },
      }
    )
  )

  return (
    <>
      <AuthHeading title="Choose a new password" description="Pick something you'll remember." />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormError message={reset.isError ? errorMessage(reset.error) : null} />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint={`At least ${LIMITS.passwordMin} characters.`}
          error={errors.password?.message}
          {...form.register("password")}
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...form.register("confirmPassword")}
        />
        <SubmitButton pending={reset.isPending} pendingLabel="Saving…">
          Save new password
        </SubmitButton>
      </form>
    </>
  )
}
