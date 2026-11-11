import { cn } from "cn"
import { LifeBuoyIcon } from "lucide-react"

import { CRISIS } from "@/lib/config/ministry"

/** Gentle, always-available pointer to emergency help. */
export function CrisisNote({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <aside
      className={cn(
        "rounded-2xl bg-info-soft text-[#183a66]",
        compact ? "flex items-start gap-3 p-4 text-sm" : "p-5",
        className
      )}
    >
      {compact ? (
        <>
          <LifeBuoyIcon className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
          <p>
            In immediate danger? Call <a className="font-semibold underline" href={`tel:${CRISIS.emergency}`}>{CRISIS.emergency}</a>. For crisis
            support, call or text <a className="font-semibold underline" href="tel:988">{CRISIS.crisisLine}</a>.
          </p>
        </>
      ) : (
        <>
          <h2 className="mb-1.5 flex items-center gap-2 text-base font-semibold">
            <LifeBuoyIcon className="size-[18px]" aria-hidden="true" />
            Need help right now?
          </h2>
          <p className="text-sm leading-relaxed">
            If you&apos;re in immediate danger, call{" "}
            <a className="font-semibold underline" href={`tel:${CRISIS.emergency}`}>{CRISIS.emergency}</a>. For crisis support any time,
            call or text <a className="font-semibold underline" href="tel:988">{CRISIS.crisisLine}</a>.
          </p>
        </>
      )}
    </aside>
  )
}
