"use client"

import type { ReactNode } from "react"

import { Toaster } from "@/components/ui/sonner"

import { ApiProvider } from "./api-provider"
import { QueryProvider } from "./query-provider"
import { ServiceWorkerCleanup } from "./service-worker-cleanup"
import { SmoothScrollProvider } from "./smooth-scroll-provider"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ApiProvider>
      <QueryProvider>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <Toaster position="top-center" richColors={false} closeButton offset={16} mobileOffset={12} />
        <ServiceWorkerCleanup />
      </QueryProvider>
    </ApiProvider>
  )
}
