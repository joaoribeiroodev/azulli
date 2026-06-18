import { redirect } from "next/navigation"

import {
  getOnboardingBootstrap,
  isOnboardingComplete,
} from "@/lib/onboarding/queries"
import { OnboardingWizard } from "./_components/onboarding-wizard"

export const metadata = { title: "Bem-vindo — Azulli" }

export default async function OnboardingPage() {
  if (await isOnboardingComplete()) {
    redirect("/dashboard")
  }

  const bootstrap = await getOnboardingBootstrap()
  if (!bootstrap) {
    redirect("/login")
  }

  return <OnboardingWizard bootstrap={bootstrap} />
}
