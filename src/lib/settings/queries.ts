import "server-only"
import { createClient } from "@/lib/supabase/server"

export type SettingsData = {
  user: {
    id: string
    email: string
    name: string
    phone: string | null
  }
  tenant: {
    id: string
    name: string
    document: string | null
    tier: "trial" | "pro" | "enterprise"
    subscription_status: "active" | "past_due" | "canceled"
    trial_ends_at: string
  }
  settings: {
    default_tax_regime: "mei" | "simples_nacional"
    billing_email: string | null
  }
}

export async function getSettingsData(): Promise<SettingsData | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [tenantRes, settingsRes] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, name, document, tier, subscription_status, trial_ends_at")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tenant_settings")
      .select("default_tax_regime, billing_email")
      .limit(1)
      .maybeSingle(),
  ])

  if (!tenantRes.data) return null

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      name: (user.user_metadata?.name as string | undefined) ?? "",
      phone: (user.user_metadata?.phone as string | undefined) ?? null,
    },
    tenant: tenantRes.data as SettingsData["tenant"],
    settings: (settingsRes.data ?? {
      default_tax_regime: "mei",
      billing_email: null,
    }) as SettingsData["settings"],
  }
}
