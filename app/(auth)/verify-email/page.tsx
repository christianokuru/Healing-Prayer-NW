import type { Metadata } from "next"
import { Suspense } from "react"

import { FormSkeleton } from "@/features/auth/components/form-skeleton"
import { VerifyEmailForm } from "@/features/auth/components/verify-email-form"

export const metadata: Metadata = { title: "Confirm your email" }

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={1} />}>
      <VerifyEmailForm />
    </Suspense>
  )
}
