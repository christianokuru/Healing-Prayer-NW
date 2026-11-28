"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useApi } from "@/components/providers/api-provider"
import type { CreateBookingInput } from "@/lib/api/contracts"
import { SCHEDULE } from "@/lib/config/ministry"
import { qk } from "@/lib/query/keys"

/**
 * Open Thursdays and times. While `poll` is on, re-checks every few seconds so
 * times someone else just took show as taken. Polling pauses in hidden tabs.
 */
export function useAvailability({ poll = false }: { poll?: boolean } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: qk.public.availability,
    queryFn: () => api.public.getAvailability(),
    // Slots change minute to minute, so always refetch when the picker opens.
    staleTime: 0,
    refetchInterval: poll ? SCHEDULE.slotPollSeconds * 1000 : false,
    refetchIntervalInBackground: false,
  })
}

export function useCreateBooking() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBookingInput) => api.public.createBooking(input),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: qk.public.availability }),
        qc.invalidateQueries({ queryKey: qk.admin.all }),
      ]),
  })
}
