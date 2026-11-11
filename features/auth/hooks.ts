"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { useApi } from "@/components/providers/api-provider"
import type {
  ChangePasswordInput,
  LoginInput,
  ProfileInput,
  SignupInput,
} from "@/lib/api/contracts"
import { qk } from "@/lib/query/keys"
import type { User } from "@/lib/domain/types"

export function useSession() {
  const api = useApi()
  return useQuery({
    queryKey: qk.session,
    queryFn: () => api.auth.getSession(),
    staleTime: 5 * 60_000,
  })
}

/** For components rendered inside <RequireRole>, where a user is guaranteed. */
export function useUser(): User {
  const { data } = useSession()
  if (!data) throw new Error("useUser must be used inside <RequireRole>")
  return data
}

export function useLogin() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => api.auth.login(input),
    onSuccess: (user) => {
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "session" })
      qc.setQueryData(qk.session, user)
    },
  })
}

export function useSignup() {
  const api = useApi()
  return useMutation({ mutationFn: (input: SignupInput) => api.auth.signup(input) })
}

export function useVerifyEmail() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) => api.auth.verifyEmail(email, code),
    onSuccess: (user) => qc.setQueryData(qk.session, user),
  })
}

export function useResendVerification() {
  const api = useApi()
  return useMutation({ mutationFn: (email: string) => api.auth.resendVerification(email) })
}

export function useRequestPasswordReset() {
  const api = useApi()
  return useMutation({ mutationFn: (email: string) => api.auth.requestPasswordReset(email) })
}

export function useResetPassword() {
  const api = useApi()
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      api.auth.resetPassword(token, password),
  })
}

export function useUpdateProfile() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfileInput) => api.auth.updateProfile(input),
    onSuccess: (user) => qc.setQueryData(qk.session, user),
  })
}

export function useChangePassword() {
  const api = useApi()
  return useMutation({ mutationFn: (input: ChangePasswordInput) => api.auth.changePassword(input) })
}

export function useLogout() {
  const api = useApi()
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      router.replace("/login")
      // Clear after navigating so the current screen doesn't flash empty states.
      setTimeout(() => qc.clear(), 50)
    },
  })
}
