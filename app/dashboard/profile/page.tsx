import type { Metadata } from "next"

import { CrisisNote } from "@/components/common/crisis-note"
import { PageHeader } from "@/components/common/page-header"
import { VisitorPage } from "@/features/auth/components/role-page"
import { InstallAppCard } from "@/features/pwa/install-app-card"
import { ChangePasswordForm, LogoutCard, ProfileForm } from "@/features/visitor/components/profile-forms"

export const metadata: Metadata = { title: "My profile" }

export default function ProfilePage() {
  return (
    <VisitorPage>
      <div className="mx-auto max-w-2xl animate-rise">
        <PageHeader title="My profile" />
        <div className="flex flex-col gap-6">
          <ProfileForm />
          <ChangePasswordForm />
          <InstallAppCard persistent />
          <LogoutCard />
          <CrisisNote compact />
        </div>
      </div>
    </VisitorPage>
  )
}
