import "server-only"
import { createClient } from "@/lib/supabase/server"

export type SettingsData = {
  user: {
    id: string
    email: string
    name: string
    phone: string | null
    avatar_url: string | null
  }
  tenant: {
    id: string
    name: string
    document: string | null
    tier: "trial" | "pro" | "enterprise"
    subscription_status: "active" | "past_due" | "canceled"
    trial_ends_at: string
    logo_url: string | null
    email: string | null
    phone: string | null
    inscricao_estadual: string | null
    inscricao_municipal: string | null
    cep: string | null
    logradouro: string | null
    numero: string | null
    complemento: string | null
    bairro: string | null
    cidade: string | null
    uf: string | null
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
      .select("id, name, document, tier, subscription_status, trial_ends_at, logo_url, email, phone, inscricao_estadual, inscricao_municipal, cep, logradouro, numero, complemento, bairro, cidade, uf")
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
      avatar_url:
        (user.user_metadata?.avatar_url as string | undefined) ?? null,
    },
    tenant: tenantRes.data as SettingsData["tenant"],
    settings: (settingsRes.data ?? {
      default_tax_regime: "mei",
      billing_email: null,
    }) as SettingsData["settings"],
  }
}

/**
 * Pega apenas as infos visuais do usuário para o menu da sidebar.
 * Mais leve que getSettingsData (não bate em tenants/tenant_settings).
 */
export async function getCurrentUserDisplay(): Promise<{
  name: string
  email: string
  avatar_url: string | null
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  return {
    name: (user.user_metadata?.name as string | undefined) ?? "",
    email: user.email ?? "",
    avatar_url:
      (user.user_metadata?.avatar_url as string | undefined) ?? null,
  }
}
