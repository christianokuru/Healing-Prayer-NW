import type { Metadata } from "next"
import Link from "next/link"

import { AuthHeading } from "@/features/auth/components/auth-shell"

export const metadata: Metadata = { title: "Privacy notice" }

// TODO(client): replace with the privacy notice and booking terms Janis provides.
export default function PrivacyPage() {
  return (
    <article className="flex flex-col gap-4 text-[15px] leading-relaxed text-[#2c3f38]">
      <AuthHeading title="Privacy notice" description="A plain-language summary while the full notice is prepared." />
      <p>
        We collect your name, email, phone number and the prayer points you share so we can arrange your session and
        contact you about it. Only the prayer minister can see your booking details.
      </p>
      <p>
        Prayer sessions are offered freely and are not a substitute for medical, psychological or professional care.
        Visitors attend at their own discretion.
      </p>
      <p className="rounded-xl bg-warning-soft px-4 py-3 text-warning-foreground">
        The full privacy notice and booking terms will be added here before launch.
      </p>
      <Link href="/signup" className="font-semibold text-primary-strong hover:underline">
        Back to sign up
      </Link>
    </article>
  )
}
