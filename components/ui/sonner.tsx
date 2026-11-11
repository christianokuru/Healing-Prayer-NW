"use client"

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/** App toasts: dark, calm and readable, with room for an Undo action. */
const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    className="toaster group"
    icons={{
      success: <CircleCheckIcon className="size-[18px] text-[#9fd8c2]" />,
      info: <InfoIcon className="size-[18px] text-[#b9cff0]" />,
      warning: <TriangleAlertIcon className="size-[18px] text-[#f2c14e]" />,
      error: <OctagonXIcon className="size-[18px] text-[#f4a9a2]" />,
      loading: <Loader2Icon className="size-[18px] animate-spin" />,
    }}
    toastOptions={{
      classNames: {
        toast:
          "!bg-[#12231e] !text-white !border-transparent !rounded-xl !shadow-lg !gap-3 !text-[15px] !font-sans",
        description: "!text-white/75",
        actionButton: "!bg-transparent !text-[#9fd8c2] !font-semibold !text-sm !h-9 !px-2",
        closeButton: "!bg-[#12231e] !text-white !border-white/20",
      },
    }}
    {...props}
  />
)

export { Toaster }
