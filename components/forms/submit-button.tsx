import { cn } from "cn"
import { Loader2Icon } from "lucide-react"
import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"

type SubmitButtonProps = ComponentProps<typeof Button> & {
  pending?: boolean
  pendingLabel?: string
}

/** Primary form button with a built-in loading state. */
export function SubmitButton({ pending, pendingLabel, children, className, disabled, ...props }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      size="lg"
      className={cn("w-full", className)}
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  )
}
