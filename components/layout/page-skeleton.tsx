import { Skeleton } from "@/components/ui/skeleton"

/** Generic placeholder shown while a signed-in area confirms the session. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-56 w-full rounded-[20px]" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-36 rounded-[20px]" />
        <Skeleton className="h-36 rounded-[20px]" />
      </div>
    </div>
  )
}
