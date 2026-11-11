import type { Metadata } from "next"
import { Suspense } from "react"

import { FormSkeleton } from "@/features/auth/components/form-skeleton"
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form"

export const metadata: Metadata = { title: "Choose a new password" }

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
