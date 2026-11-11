"use client"

import { cn } from "cn"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useId, useState, type ComponentProps, type ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: string
  /** Shown at the right of the label row (e.g. "Forgot password?"). */
  aside?: ReactNode
  className?: string
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
}

/** Label + control + hint/error, wired for screen readers. */
export function Field({ label, hint, error, aside, className, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-[15px] font-semibold text-foreground">
          {label}
        </Label>
        {aside}
      </div>
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {children({ id, describedBy, invalid: !!error })}
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger-foreground">
          {error}
        </p>
      )}
    </div>
  )
}

type InputProps = Omit<ComponentProps<"input">, "id">

export function TextField({
  label,
  hint,
  error,
  aside,
  className,
  ...input
}: Omit<FieldProps, "children"> & InputProps) {
  return (
    <Field label={label} hint={hint} error={error} aside={aside} className={className}>
      {({ id, describedBy, invalid }) => (
        <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} {...input} />
      )}
    </Field>
  )
}

export function PasswordField({
  label,
  hint,
  error,
  aside,
  className,
  ...input
}: Omit<FieldProps, "children"> & InputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <Field label={label} hint={hint} error={error} aside={aside} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <Input
            id={id}
            type={visible ? "text" : "password"}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className="pr-12"
            {...input}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            {visible ? <EyeOffIcon className="size-[18px]" /> : <EyeIcon className="size-[18px]" />}
          </button>
        </div>
      )}
    </Field>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[15px] font-medium text-danger-foreground">
      {message}
    </div>
  )
}
