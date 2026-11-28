import type { Metadata } from "next"
import { Suspense } from "react"

import { AuthHeading } from "@/features/auth/components/auth-shell"
import { FormSkeleton } from "@/features/auth/components/form-skeleton"
import { LoginForm } from "@/features/auth/components/login-form"

export const metadata: Metadata = { title: "Prayer minister login" }

export default function LoginPage() {
  return (
    <>
      <AuthHeading
        title="Prayer minister login"
        description="For the prayer ministry team. Visitors don't need an account to book."
      />
      <Suspense fallback={<FormSkeleton />}>
        <LoginForm />
      </Suspense>
    </>
  )
}
