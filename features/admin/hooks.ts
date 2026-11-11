"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useApi } from "@/components/providers/api-provider"
import type { ApproveInput, DeclineInput } from "@/lib/api/contracts"
import type { AdminBooking, BookingStatus } from "@/lib/domain/types"
import { qk } from "@/lib/query/keys"

export function useAdminBookings() {
  const api = useApi()
  return useQuery({ queryKey: qk.admin.bookings, queryFn: () => api.admin.listBookings(), staleTime: 15_000 })
}

export function useBlockedDates() {
  const api = useApi()
  return useQuery({ queryKey: qk.admin.blocked, queryFn: () => api.admin.listBlockedDates() })
}

export function usePeople() {
  const api = useApi()
  return useQuery({ queryKey: qk.admin.people, queryFn: () => api.admin.listPeople() })
}

export function usePerson(id: string | null) {
  const api = useApi()
  return useQuery({
    queryKey: qk.admin.person(id ?? ""),
    queryFn: () => api.admin.getPerson(id!),
    enabled: !!id,
  })
}

export function useAnalytics(months = 6) {
  const api = useApi()
  return useQuery({ queryKey: qk.admin.analytics(months), queryFn: () => api.admin.getAnalytics(months) })
}

/**
 * Status changes update the list instantly (optimistic), then reconcile
 * with the server. On failure the previous list is restored.
 */
function useStatusMutation<TInput>(
  mutationFn: (input: TInput) => Promise<AdminBooking>,
  idOf: (input: TInput) => string,
  nextStatus: BookingStatus
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.admin.bookings })
      const previous = qc.getQueryData<AdminBooking[]>(qk.admin.bookings)
      qc.setQueryData<AdminBooking[]>(qk.admin.bookings, (list) =>
        list?.map((b) => (b.id === idOf(input) ? { ...b, status: nextStatus } : b))
      )
      return { previous }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.admin.bookings, ctx.previous)
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: qk.admin.all }),
        qc.invalidateQueries({ queryKey: qk.visitor.all }),
      ]),
  })
}

export function useApprove() {
  const api = useApi()
  return useStatusMutation((i: ApproveInput) => api.admin.approve(i), (i) => i.bookingId, "confirmed")
}

export function useDecline() {
  const api = useApi()
  return useStatusMutation((i: DeclineInput) => api.admin.decline(i), (i) => i.bookingId, "declined")
}

export function useRevertDecision() {
  const api = useApi()
  return useStatusMutation((id: string) => api.admin.revertDecision(id), (id) => id, "pending")
}

export function useMarkNoShow() {
  const api = useApi()
  return useStatusMutation((id: string) => api.admin.markNoShow(id), (id) => id, "no_show")
}

export function useUndoNoShow() {
  const api = useApi()
  return useStatusMutation((id: string) => api.admin.undoNoShow(id), (id) => id, "confirmed")
}

function useInvalidateAll() {
  const qc = useQueryClient()
  return () =>
    Promise.all([qc.invalidateQueries({ queryKey: qk.admin.all }), qc.invalidateQueries({ queryKey: qk.visitor.all })])
}

export function useBlockDate() {
  const api = useApi()
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ date, reason }: { date: string; reason?: string }) => api.admin.blockDate(date, reason),
    onSettled: invalidate,
  })
}

export function useUnblockDate() {
  const api = useApi()
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: (date: string) => api.admin.unblockDate(date), onSettled: invalidate })
}
