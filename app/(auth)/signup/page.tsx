import type { Metadata } from "next"

import { AuthHeading } from "@/features/auth/components/auth-shell"
import { SignupForm } from "@/features/auth/components/signup-form"

export const metadata: Metadata = { title: "Create an account" }

export default function SignupPage() {
  return (
    <>
      <AuthHeading
        title="Create your account"
        description="It only takes a minute. You'll use it to book and manage your prayer sessions."
      />
      <SignupForm />
    </>
  )
}
