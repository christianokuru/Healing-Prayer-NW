import { cn } from "cn"

import { TRANSLATION, type Scripture } from "../scripture"

interface VerseProps {
  verse: Scripture
  className?: string
  size?: "md" | "lg"
  align?: "left" | "center"
}

/** A Bible verse set in the serif, with its reference underneath. */
export function Verse({ verse, className, size = "md", align = "center" }: VerseProps) {
  return (
    <figure className={cn(align === "center" && "text-center", className)}>
      <blockquote
        className={cn(
          "font-heading italic leading-snug text-[#2b3b35]",
          size === "lg" ? "text-[26px] md:text-[34px]" : "text-[21px] md:text-[24px]"
        )}
      >
        “{verse.text}”
      </blockquote>
      <figcaption className="mt-3 text-sm font-semibold tracking-[0.08em] text-rose-strong uppercase">
        {verse.reference} <span className="font-normal text-muted-foreground normal-case">({TRANSLATION})</span>
      </figcaption>
    </figure>
  )
}
