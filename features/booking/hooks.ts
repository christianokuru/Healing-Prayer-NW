"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useApi } from "@/components/providers/api-provider"
import type { CreateBookingInput } from "@/lib/api/contracts"
import { qk } from "@/lib/query/keys"

export function useAvailability() {
  const api = useApi()
  // Slots change minute to minute, so always refetch when the picker opens.
  return useQuery({ queryKey: qk.public.availability, queryFn: () => api.public.getAvailability(), staleTime: 0 })
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
