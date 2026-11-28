import type { Metadata } from "next"

import { PrivacyNotice } from "@/features/public/components/privacy-notice"
import { PublicContainer } from "@/features/public/components/public-shell"

export const metadata: Metadata = { title: "Privacy notice" }

export default function PrivacyPage() {
  return (
    <PublicContainer>
      <PrivacyNotice />
    </PublicContainer>
  )
}
