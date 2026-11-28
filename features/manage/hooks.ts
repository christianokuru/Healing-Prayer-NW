"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useApi } from "@/components/providers/api-provider"
import type { ManagedBooking } from "@/lib/domain/types"
import { qk } from "@/lib/query/keys"

export function useManagedBooking(token: string) {
  const api = useApi()
  return useQuery({
    queryKey: qk.public.managed(token),
    queryFn: () => api.public.getManagedBooking(token),
    retry: false,
  })
}

/** After a change, show the new state at once and refresh what depends on it. */
function useOnChanged(token: string) {
  const qc = useQueryClient()
  return (booking: ManagedBooking) => {
    qc.setQueryData(qk.public.managed(token), booking)
    return Promise.all([
      qc.invalidateQueries({ queryKey: qk.public.availability }),
      qc.invalidateQueries({ queryKey: qk.admin.all }),
    ])
  }
}

export function useCancelManaged(token: string) {
  const api = useApi()
  const onChanged = useOnChanged(token)
  return useMutation({ mutationFn: () => api.public.cancelManagedBooking(token), onSuccess: onChanged })
}

export function useLateNotice(token: string) {
  const api = useApi()
  const onChanged = useOnChanged(token)
  return useMutation({
    mutationFn: (message?: string) => api.public.sendLateNotice(token, message),
    onSuccess: onChanged,
  })
}
