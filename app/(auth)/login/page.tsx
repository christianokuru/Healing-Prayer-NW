import type { Metadata } from "next"
import { Suspense } from "react"

import { AuthHeading } from "@/features/auth/components/auth-shell"
import { FormSkeleton } from "@/features/auth/components/form-skeleton"
import { LoginForm } from "@/features/auth/components/login-form"

export const metadata: Metadata = { title: "Log in" }

export default function LoginPage() {
  return (
    <>
      <AuthHeading title="Welcome back" description="Log in to book a prayer session or check on your requests." />
      <Suspense fallback={<FormSkeleton />}>
        <LoginForm />
      </Suspense>
    </>
  )
}
