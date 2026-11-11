import { z } from "zod"

import { LIMITS } from "@/lib/config/ministry"

const email = z.string().trim().min(1, "Please enter your email address.").email("Please enter a valid email address.")
const password = z
  .string()
  .min(LIMITS.passwordMin, `Use at least ${LIMITS.passwordMin} characters.`)
  .max(128, "That password is too long.")
const phone = z
  .string()
  .trim()
  .refine((v) => v.replace(/\D/g, "").length >= 10, "Please enter a phone number with area code.")

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password."),
})

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name.").max(80, "That name is too long."),
    email,
    phone,
    password,
    confirmPassword: z.string(),
    agree: z.boolean().refine((v) => v, "Please agree to the privacy notice to continue."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords don't match.",
  })

export const verifySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from the email."),
})

export const forgotSchema = z.object({ email })

export const resetSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords don't match.",
  })

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(80, "That name is too long."),
  phone,
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Please enter your current password."),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords don't match.",
  })

export type LoginValues = z.infer<typeof loginSchema>
export type SignupValues = z.infer<typeof signupSchema>
export type VerifyValues = z.infer<typeof verifySchema>
export type ForgotValues = z.infer<typeof forgotSchema>
export type ResetValues = z.infer<typeof resetSchema>
export type ProfileValues = z.infer<typeof profileSchema>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
