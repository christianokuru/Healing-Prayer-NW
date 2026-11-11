import { MapPinIcon, VideoIcon } from "lucide-react"

import { MINISTRY } from "@/lib/config/ministry"
import type { AttendanceMode } from "@/lib/domain/types"

/** "Where" line for a session, in person or online. */
export function SessionWhere({ mode, className }: { mode: AttendanceMode; className?: string }) {
  if (mode === "online") {
    return (
      <span className={className}>
        <VideoIcon className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
        <span>Online by Zoom. The link is in your confirmation email.</span>
      </span>
    )
  }
  return (
    <span className={className}>
      <MapPinIcon className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
      <span>
        In person at {MINISTRY.location.name}
        <br />
        {MINISTRY.location.street}, Calgary
      </span>
    </span>
  )
}
