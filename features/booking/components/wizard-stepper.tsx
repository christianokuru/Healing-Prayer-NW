import { cn } from "cn"

import type { WizardStep } from "../state"

const LABELS: Record<WizardStep, string> = {
  day: "Thursday",
  time: "Time",
  details: "Prayer points",
  review: "Review",
  done: "Done",
}

export function WizardStepper({ steps, current }: { steps: WizardStep[]; current: WizardStep }) {
  const index = steps.indexOf(current)
  return (
    <ol
      aria-label={`Step ${index + 1} of ${steps.length}`}
      className="mb-6 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((s, i) => {
        const done = i < index
        const active = i === index
        return (
          <li key={s} className="flex flex-col gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "h-1.5 rounded-full transition-colors duration-300",
                done || active ? "bg-primary" : "bg-[#dce4e0]"
              )}
            />
            <span
              className={cn(
                "truncate text-[13px] sm:text-sm",
                active ? "font-bold text-foreground" : done ? "font-medium text-primary-strong" : "text-muted-foreground"
              )}
            >
              <span className="sr-only">{done ? "Completed: " : active ? "Current: " : ""}</span>
              {i + 1}. {LABELS[s]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
