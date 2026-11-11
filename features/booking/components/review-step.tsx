import type { ReactNode } from "react"

import { fmt } from "@/lib/domain/time"
import { modeLabel, topicLabel } from "@/lib/domain/topics"
import type { Booking } from "@/lib/domain/types"

import type { BookingDetails, WizardStep } from "../state"

interface ReviewStepProps {
  slotStart: string
  details?: BookingDetails
  /** Reschedule mode: the session being moved. */
  original?: Booking
  onEdit: (step: WizardStep) => void
}

function Row({ label, children, onEdit }: { label: string; children: ReactNode; onEdit?: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-b border-border py-4 last:border-b-0 sm:grid-cols-[160px_1fr_auto]">
      <dt className="text-sm text-muted-foreground sm:text-[15px]">{label}</dt>
      <dd className="col-span-2 row-start-2 font-medium sm:col-span-1 sm:row-start-auto">{children}</dd>
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

export function ReviewStep({ slotStart, details, original, onEdit }: ReviewStepProps) {
  return (
    <div>
      {original && (
        <p className="mb-4 rounded-2xl bg-info-soft px-4 py-3 text-[15px] text-[#183a66]">
          Moving from <strong>{fmt.dateLong(original.slotStart)} at {fmt.time(original.slotStart)}</strong>. Your current
          session stays booked until the new time is approved.
        </p>
      )}
      <dl>
        <Row label="Date" onEdit={() => onEdit("day")}>
          {fmt.dateFull(slotStart)}
        </Row>
        <Row label="Time" onEdit={() => onEdit("time")}>
          {fmt.timeRange(slotStart)} (Calgary time)
        </Row>
        {details && (
          <>
            <Row label="Attending" onEdit={() => onEdit("details")}>
              {details.mode === "online" ? "Online by Zoom (link emailed after approval)" : `${modeLabel(details.mode)} at Alberta Bible College`}
            </Row>
            <Row label="Topic" onEdit={() => onEdit("details")}>
              {topicLabel(details.topic)}
            </Row>
            <Row label="Prayer points" onEdit={() => onEdit("details")}>
              <span className="font-heading text-[17px] leading-relaxed font-normal whitespace-pre-line">
                “{details.prayerPoints.trim()}”
              </span>
            </Row>
          </>
        )}
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">
        Your time will be held for you while the prayer minister reviews your request.
      </p>
    </div>
  )
}
