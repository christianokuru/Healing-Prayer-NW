import type { ReactNode } from "react"

import { MINISTRY } from "@/lib/config/ministry"
import { fmt } from "@/lib/domain/time"

import type { BookingDetails, WizardStep } from "../state"

interface ReviewStepProps {
  slotStart: string
  details: BookingDetails
  onEdit: (step: WizardStep) => void
}

function Row({ label, children, onEdit }: { label: string; children: ReactNode; onEdit?: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-b border-border py-4 last:border-b-0 sm:grid-cols-[160px_1fr_auto]">
      <dt className="text-sm text-muted-foreground sm:text-[15px]">{label}</dt>
      <dd className="col-span-2 row-start-2 font-medium break-words sm:col-span-1 sm:row-start-auto">{children}</dd>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="col-start-2 row-start-1 h-8 self-start text-sm font-semibold text-primary-strong hover:underline sm:col-start-3"
        >
          Change
        </button>
      ) : (
        <span />
      )}
    </div>
  )
}

export function ReviewStep({ slotStart, details, onEdit }: ReviewStepProps) {
  const editDetails = () => onEdit("details")
  return (
    <div>
      <dl>
        <Row label="Date" onEdit={() => onEdit("day")}>
          {fmt.dateFull(slotStart)}
        </Row>
        <Row label="Time" onEdit={() => onEdit("time")}>
          {fmt.timeRange(slotStart)} (Calgary time)
        </Row>
        <Row label="Where" onEdit={editDetails}>
          {details.online ? "Online by Zoom (the link is emailed after approval)" : `In person at ${MINISTRY.location.name}`}
        </Row>
        <Row label="Name" onEdit={editDetails}>
          {details.fullName.trim()}
        </Row>
        <Row label="Email" onEdit={editDetails}>
          {details.email.trim()}
        </Row>
        <Row label="Phone" onEdit={editDetails}>
          {details.phone.trim()}
        </Row>
        <Row label="Prayer points" onEdit={editDetails}>
          <span className="font-heading text-[17px] leading-relaxed font-normal whitespace-pre-line">
            “{details.prayerPoints.trim()}”
          </span>
        </Row>
      </dl>
      <p className="mt-4 text-[15px] text-muted-foreground">
        Your time is held for you while the prayer minister reviews your request. You&apos;ll get an email either way.
      </p>
    </div>
  )
}
