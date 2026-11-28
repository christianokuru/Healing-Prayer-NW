"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"

import { FormError, PasswordField, TextField } from "@/components/forms/field"
import { SubmitButton } from "@/components/forms/submit-button"
import { errorMessage } from "@/lib/api/errors"
import { postLoginPath } from "@/lib/auth/safe-redirect"

import { useLogin } from "../hooks"
import { loginSchema, type LoginValues } from "../schemas"
import { DemoAccounts } from "./demo-accounts"

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const login = useLogin()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, { onSuccess: () => router.replace(postLoginPath(params.get("next"))) })
  )

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormError message={login.isError ? errorMessage(login.error) : null} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...form.register("email")}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          aside={
            <Link href="/forgot-password" className="text-sm font-semibold text-primary-strong hover:underline">
              Forgot password?
            </Link>
          }
          {...form.register("password")}
        />
        <SubmitButton pending={login.isPending} pendingLabel="Logging in…" className="mt-1">
          Log in
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-[15px] text-[#44564f]">
        Looking to book a prayer session?{" "}
        <Link href="/book" className="font-semibold text-primary-strong hover:underline">
          Book here, no account needed
        </Link>
      </p>
      <DemoAccounts
        onPick={(email, password) => {
          form.setValue("email", email, { shouldValidate: true })
          form.setValue("password", password, { shouldValidate: true })
        }}
      />
    </>
  )
}
