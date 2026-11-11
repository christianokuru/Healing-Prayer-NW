import { cn } from "cn"

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")

const SIZES = { sm: "size-9 text-[13px]", md: "size-11 text-sm", lg: "size-14 text-base" }

export function InitialsAvatar({
  name,
  size = "md",
  className,
}: {
  name: string
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-info-soft font-semibold text-info-foreground",
        SIZES[size],
        className
      )}
    >
      {initialsOf(name)}
    </span>
  )
}
