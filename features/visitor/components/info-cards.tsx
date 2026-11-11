import { ClockIcon, NavigationIcon } from "lucide-react"

import { Surface } from "@/components/common/surface"
import { Button } from "@/components/ui/button"
import { MINISTRY, SCHEDULE } from "@/lib/config/ministry"

const STEPS = [
  { title: "Request a time", body: "Choose an open Thursday evening, up to a month ahead." },
  { title: "Get confirmed", body: "You'll receive an email once your request is approved." },
  { title: "Come for prayer", body: "A 30-minute session with a team of two or three prayer ministers." },
]

export function HowItWorksCard() {
  return (
    <Surface>
      <h2 className="mb-4 font-heading text-[22px] font-medium">How it works</h2>
      <ol className="flex flex-col gap-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-strong">
              {i + 1}
            </span>
            <span>
              <strong className="block font-semibold">{s.title}</strong>
              <span className="text-sm text-[#4a5d56]">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </Surface>
  )
}

export function LocationCard() {
  const { location } = MINISTRY
  return (
    <Surface className="overflow-hidden p-0 md:p-0">
      <div className="relative h-32 bg-info-soft" aria-hidden="true">
        <svg viewBox="0 0 360 132" preserveAspectRatio="xMidYMid slice" className="size-full" fill="none">
          <path d="M-10 96C60 70 110 112 180 84s120-40 190-12" stroke="#c3d5ee" strokeWidth="10" />
          <path d="M60 -10 92 142" stroke="#fff" strokeWidth="8" />
          <path d="M-10 40h380" stroke="#fff" strokeWidth="6" />
          <path d="M250 -10 230 142" stroke="#fff" strokeWidth="6" />
          <rect x="120" y="50" width="64" height="40" rx="6" fill="#d3e1f3" />
          <rect x="268" y="58" width="50" height="34" rx="6" fill="#d3e1f3" />
        </svg>
        <span className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-[60%] -rotate-45 items-center justify-center rounded-[50%_50%_50%_0] bg-info shadow-[0_6px_16px_rgba(39,90,156,0.35)]">
          <span className="size-3 rounded-full bg-white" />
        </span>
      </div>
      <div className="p-5">
        <h2 className="text-[17px] font-semibold">Where we meet</h2>
        <p className="mt-1 text-[15px] text-[#44564f]">
          {location.name}
          <br />
          {location.street}, {location.city}
        </p>
        <p className="mt-3 flex items-center gap-2 text-sm text-[#44564f]">
          <ClockIcon className="size-4" aria-hidden="true" />
          {SCHEDULE.weekdayName}s, {SCHEDULE.hoursLabel}
        </p>
        <Button
          nativeButton={false}
          render={<a href={location.mapsUrl} target="_blank" rel="noopener noreferrer" />}
          variant="outline"
          className="mt-4 w-full"
        >
          <NavigationIcon aria-hidden="true" /> Get directions
        </Button>
      </div>
    </Surface>
  )
}
