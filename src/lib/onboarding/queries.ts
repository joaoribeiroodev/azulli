import { createClient } from "@/lib/supabase/server"

import { isMissingDbColumn } from "./db"

export type OnboardingBootstrap = {
  trialEndsAt: string | null
  tenantName: string
  defaultTaxRegime: "mei" | "simples_nacional"
  document: string | null
  businessType: string | null
}

export async function getOnboardingBootstrap(): Promise<OnboardingBootstrap | null> {
  const supabase = await createClient()

  let tenantRes = await supabase
    .from("tenants")
    .select("name, trial_ends_at, document, onboarding_completed_at")
    .limit(1)
    .maybeSingle()

  if (
    tenantRes.error &&
    isMissingDbColumn(tenantRes.error.message, "onboarding_completed_at")
  ) {
    tenantRes = await supabase
      .from("tenants")
      .select("name, trial_ends_at, document")
      .limit(1)
      .maybeSingle()
  }

  if (tenantRes.error || !tenantRes.data) {
    if (tenantRes.error) {
      console.error(
        "[onboarding] getOnboardingBootstrap tenant:",
        tenantRes.error.message
      )
    }
    return null
  }

  const tenant = tenantRes.data

  let settingsRes = await supabase
    .from("tenant_settings")
    .select("default_tax_regime, business_type")
    .limit(1)
    .maybeSingle()

  if (
    settingsRes.error &&
    isMissingDbColumn(settingsRes.error.message, "business_type")
  ) {
    settingsRes = await supabase
      .from("tenant_settings")
      .select("default_tax_regime")
      .limit(1)
      .maybeSingle()
  }

  const settings = settingsRes.data

  return {
    trialEndsAt: tenant.trial_ends_at as string | null,
    tenantName: tenant.name as string,
    defaultTaxRegime:
      (settings?.default_tax_regime as "mei" | "simples_nacional") ?? "mei",
    document: tenant.document as string | null,
    businessType: (settings?.business_type as string | null) ?? null,
  }
}

/**
 * Retorna true se onboarding foi concluído ou se a migration ainda não foi
 * aplicada (evita bloquear o app inteiro).
 */
export async function isOnboardingComplete(): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tenants")
    .select("onboarding_completed_at")
    .limit(1)
    .maybeSingle()

  if (error) {
    if (isMissingDbColumn(error.message, "onboarding_completed_at")) {
      return true
    }
    console.error("[onboarding] isOnboardingComplete:", error.message)
    return true
  }

  return Boolean(data?.onboarding_completed_at)
}
