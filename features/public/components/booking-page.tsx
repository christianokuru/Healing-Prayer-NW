import { PageHeader } from "@/components/common/page-header"
import { BookingWizard } from "@/features/booking/components/booking-wizard"

import { HowItWorksCard, LocationCard } from "./info-cards"

/** The public home for now: book a session, with the essentials alongside. */
export function BookingPage() {
  return (
    <div className="animate-rise">
      <PageHeader
        title="Book a prayer session"
        description="Free · 30 minutes · Thursday evenings at Alberta Bible College. No account or password needed."
        className="md:mb-8"
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <BookingWizard />
        <aside className="flex flex-col gap-6">
          <HowItWorksCard />
          <LocationCard />
        </aside>
      </div>
    </div>
  )
}
