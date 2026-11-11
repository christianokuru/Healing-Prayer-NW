"use client"

import { Loader2Icon } from "lucide-react"
import type { ReactNode } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** Extra content (inputs, details) between the description and buttons. */
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: "default" | "danger"
  pending?: boolean
  confirmDisabled?: boolean
  onConfirm: () => void
}

/** One consistent confirmation pattern for every irreversible action. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Go back",
  tone = "default",
  pending,
  confirmDisabled,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <AlertDialogContent className="gap-5 rounded-2xl p-6 data-[size=default]:max-w-[calc(100%-2rem)] sm:data-[size=default]:max-w-md">
        <AlertDialogHeader className="place-items-start text-left">
          <AlertDialogTitle className="text-2xl leading-tight">{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-[15px] leading-relaxed text-[#44564f]">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter className="mx-0 mb-0 flex-col-reverse gap-2 rounded-none border-0 bg-transparent p-0 sm:flex-row sm:justify-end">
          <AlertDialogCancel disabled={pending} className="h-11 w-full sm:w-auto">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={tone === "danger" ? "destructive" : "default"}
            className="h-11 w-full sm:w-auto"
            disabled={pending || confirmDisabled}
            onClick={onConfirm}
          >
            {pending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
