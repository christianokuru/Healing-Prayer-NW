"use client"

import { cn } from "cn"
import { CheckCircle2Icon, ShareIcon, SmartphoneIcon, XIcon } from "lucide-react"

import { LogoMark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

import { useInstallPrompt } from "./use-install-prompt"

/**
 * Invites people to add the app to their home screen. On iPhone there is
 * no install prompt, so it explains the Share → Add to Home Screen steps.
 * `persistent` (profile page) ignores the dismissed state.
 */
export function InstallAppCard({ persistent, className }: { persistent?: boolean; className?: string }) {
  const { support, install, dismissed, dismiss } = useInstallPrompt()

  if (support === "unsupported" || (!persistent && (dismissed || support === "installed"))) return null

  return (
    <section className={cn("relative rounded-[20px] border border-border bg-card p-5", className)}>
      {!persistent && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-2 right-2 flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted"
        >
          <XIcon className="size-4" />
        </button>
      )}
      <div className="flex items-center gap-3 pr-8">
        <LogoMark className="size-11 rounded-2xl" />
        <div>
          <h2 className="text-[16px] font-semibold">
            {support === "installed" ? "The app is installed" : "Add the app to your phone"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {support === "installed" ? "Open it from your home screen anytime." : "Book and check your sessions in one tap."}
          </p>
        </div>
      </div>
      {support === "prompt" && (
        <Button className="mt-4 w-full" onClick={install}>
          <SmartphoneIcon aria-hidden="true" /> Install app
        </Button>
      )}
      {support === "ios" && (
        <ol className="mt-4 flex flex-col gap-2 rounded-xl bg-surface-muted p-3.5 text-sm text-[#3f524b]">
          <li className="flex items-center gap-2">
            1. Tap <ShareIcon className="size-4 text-info" aria-label="the Share button" /> at the bottom of Safari
          </li>
          <li>2. Choose “Add to Home Screen”</li>
        </ol>
      )}
      {support === "installed" && (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-primary-strong">
          <CheckCircle2Icon className="size-4" aria-hidden="true" /> You&apos;re all set
        </p>
      )}
    </section>
  )
}
