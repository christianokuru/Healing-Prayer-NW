"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useApi } from "@/components/providers/api-provider"
import type { CreateBookingInput, RescheduleInput } from "@/lib/api/contracts"
import { qk } from "@/lib/query/keys"

export function useMyBookings() {
  const api = useApi()
  return useQuery({ queryKey: qk.visitor.bookings, queryFn: () => api.visitor.listMyBookings() })
}

/** Availability changes minute to minute, so it is always refetched on mount. */
export function useAvailability(excludeBookingId?: string) {
  const api = useApi()
  return useQuery({
    queryKey: qk.visitor.availability(excludeBookingId),
    queryFn: () => api.visitor.getAvailability({ excludeBookingId }),
    staleTime: 0,
  })
}

/** Any booking change affects the visitor's lists, availability and the admin views. */
function useInvalidateBookings() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.visitor.all }),
      qc.invalidateQueries({ queryKey: qk.admin.all }),
    ])
}

export function useCreateBooking() {
  const api = useApi()
  const invalidate = useInvalidateBookings()
  return useMutation({
    mutationFn: (input: CreateBookingInput) => api.visitor.createBooking(input),
    onSettled: invalidate,
  })
}

export function useRequestReschedule() {
  const api = useApi()
  const invalidate = useInvalidateBookings()
  return useMutation({
    mutationFn: (input: RescheduleInput) => api.visitor.requestReschedule(input),
    onSettled: invalidate,
  })
}

export function useCancelBooking() {
  const api = useApi()
  const invalidate = useInvalidateBookings()
  return useMutation({
    mutationFn: (bookingId: string) => api.visitor.cancelBooking(bookingId),
    onSettled: invalidate,
  })
}

export function useSendLateNotice() {
  const api = useApi()
  const invalidate = useInvalidateBookings()
  return useMutation({
    mutationFn: ({ bookingId, message }: { bookingId: string; message?: string }) =>
      api.visitor.sendLateNotice(bookingId, message),
    onSettled: invalidate,
  })
}
