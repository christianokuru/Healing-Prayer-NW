import { z } from "zod"

import { LIMITS } from "@/lib/config/ministry"

export const emailField = z
  .string()
  .trim()
  .min(1, "Please enter your email address.")
  .email("Please enter a valid email address, like name@example.com.")
const password = z
  .string()
  .min(LIMITS.passwordMin, `Use at least ${LIMITS.passwordMin} characters.`)
  .max(128, "That password is too long.")

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Please enter your password."),
})

export const forgotSchema = z.object({ email: emailField })

export const resetSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords don't match.",
  })

export type LoginValues = z.infer<typeof loginSchema>
export type ForgotValues = z.infer<typeof forgotSchema>
export type ResetValues = z.infer<typeof resetSchema>
