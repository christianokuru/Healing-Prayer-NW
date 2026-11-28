import type { Metadata } from "next"
import { Suspense } from "react"

import { ListSkeleton } from "@/components/common/feedback"
import { ManageBooking } from "@/features/manage/components/manage-booking"
import { PublicContainer } from "@/features/public/components/public-shell"

export const metadata: Metadata = {
  title: "Your prayer session",
  // A private link: keep it out of search engines and referrer headers.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default function ManagePage({ params }: PageProps<"/manage/[token]">) {
  return (
    <PublicContainer>
      <Suspense fallback={<ListSkeleton rows={2} />}>
        {params.then(({ token }) => (
          <ManageBooking token={token} />
        ))}
      </Suspense>
    </PublicContainer>
  )
}
