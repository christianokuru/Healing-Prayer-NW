"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { LogOutIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormError, PasswordField, TextField } from "@/components/forms/field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Surface, SurfaceHeader } from "@/components/common/surface"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useChangePassword, useLogout, useUpdateProfile, useUser } from "@/features/auth/hooks"
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from "@/features/auth/schemas"
import { errorMessage } from "@/lib/api/errors"

export function ProfileForm() {
  const user = useUser()
  const update = useUpdateProfile()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { fullName: user.fullName, phone: user.phone },
  })
  const { errors, isDirty } = form.formState

  return (
    <Surface>
      <SurfaceHeader title="Your details" description="We use these to contact you about your sessions." />
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={form.handleSubmit((values) =>
          update.mutate(values, {
            onSuccess: () => toast.success("Your details have been saved."),
          })
        )}
      >
        <FormError message={update.isError ? errorMessage(update.error) : null} />
        <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...form.register("fullName")} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-email" className="text-[15px] font-semibold">
            Email
          </Label>
          <Input id="profile-email" value={user.email} readOnly disabled aria-describedby="profile-email-hint" />
          <p id="profile-email-hint" className="text-sm text-muted-foreground">
            To change your email, please contact the prayer minister.
          </p>
        </div>
        <TextField
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...form.register("phone")}
        />
        <SubmitButton pending={update.isPending} pendingLabel="Saving…" disabled={!isDirty} className="sm:w-auto sm:self-start">
          Save changes
        </SubmitButton>
      </form>
    </Surface>
  )
}

export function ChangePasswordForm() {
  const change = useChangePassword()
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })
  const { errors } = form.formState

  return (
    <Surface>
      <SurfaceHeader title="Password" />
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={form.handleSubmit(({ currentPassword, newPassword }) =>
          change.mutate(
            { currentPassword, newPassword },
            {
              onSuccess: () => {
                form.reset()
                toast.success("Your password has been changed.")
              },
            }
          )
        )}
      >
        <FormError message={change.isError ? errorMessage(change.error) : null} />
        <PasswordField label="Current password" autoComplete="current-password" error={errors.currentPassword?.message} {...form.register("currentPassword")} />
        <PasswordField label="New password" autoComplete="new-password" error={errors.newPassword?.message} {...form.register("newPassword")} />
        <PasswordField label="Confirm new password" autoComplete="new-password" error={errors.confirmPassword?.message} {...form.register("confirmPassword")} />
        <SubmitButton pending={change.isPending} pendingLabel="Saving…" className="sm:w-auto sm:self-start">
          Change password
        </SubmitButton>
      </form>
    </Surface>
  )
}

export function LogoutCard() {
  const logout = useLogout()
  return (
    <Surface className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-[17px] font-semibold">Log out</h2>
        <p className="text-sm text-muted-foreground">You can log back in anytime with your email and password.</p>
      </div>
      <Button variant="outline" disabled={logout.isPending} onClick={() => logout.mutate()}>
        <LogOutIcon aria-hidden="true" /> Log out
      </Button>
    </Surface>
  )
}
