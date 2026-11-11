"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

import { isApiError } from "@/lib/api/errors"

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: true,
        // Domain errors (403, 404, validation) won't fix themselves: don't retry.
        retry: (count, error) => !isApiError(error) && count < 2,
      },
      mutations: { retry: false },
    },
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
