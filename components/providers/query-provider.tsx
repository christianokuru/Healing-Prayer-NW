"use client"

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

import { isApiError } from "@/lib/api/errors"
import { qk } from "@/lib/query/keys"

function makeClient() {
  // If the minister's session runs out mid-use, re-check it: the admin gate
  // then sends her to the login page instead of showing errors everywhere.
  const onError = (error: unknown) => {
    if (isApiError(error) && error.code === "unauthenticated") {
      void client.invalidateQueries({ queryKey: qk.session })
    }
  }
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: true,
        // Domain errors (403, 404, validation) won't fix themselves: don't retry.
        // A dropped connection or a server hiccup ("internal") might.
        retry: (count, error) => (!isApiError(error) || error.code === "internal") && count < 2,
      },
      mutations: { retry: false },
    },
  })
  return client
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
