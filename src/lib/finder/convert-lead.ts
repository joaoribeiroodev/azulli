import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export type ConvertFinderLeadInput = {
  finderLeadId: string
  email?: string | null
  nome: string
  telefone?: string | null
  cnpj?: string | null
  plano: "pro" | "enterprise"
}

export type ConvertFinderLeadResult = {
  status: "linked" | "pending_signup"
  tenantId?: string
  tenantName?: string
  subscriptionStatus?: string
  appUrl?: string
  registerUrl?: string
  message: string
}

function normalizeDocument(doc: string | null | undefined): string | null {
  if (!doc) return null
  const digits = doc.replace(/\D/g, "")
  return digits.length >= 11 ? digits : null
}

export async function convertFinderLead(
  input: ConvertFinderLeadInput
): Promise<ConvertFinderLeadResult> {
  const supabase = createServiceRoleClient()
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://use.azulli.app.br"
  const registerUrl = `${appUrl}/register`

  const email = input.email?.trim().toLowerCase() || null
  const cnpjNorm = normalizeDocument(input.cnpj)

  let tenantId: string | null = null
  let tenantName: string | null = null
  let subscriptionStatus: string | null = null

  if (email) {
    const { data: byTenantEmail } = await supabase
      .from("tenants")
      .select("id, name, subscription_status")
      .ilike("email", email)
      .limit(1)
      .maybeSingle()

    if (byTenantEmail) {
      tenantId = byTenantEmail.id
      tenantName = byTenantEmail.name
      subscriptionStatus = byTenantEmail.subscription_status
    }
  }

  if (!tenantId && cnpjNorm) {
    const { data: byDoc } = await supabase
      .from("tenants")
      .select("id, name, subscription_status, document")
      .not("document", "is", null)
      .limit(50)

    const match = (byDoc ?? []).find(
      (t) => normalizeDocument(t.document) === cnpjNorm
    )
    if (match) {
      tenantId = match.id
      tenantName = match.name
      subscriptionStatus = match.subscription_status
    }
  }

  if (!tenantId && email) {
    const { data: authData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    const authUser = authData?.users?.find(
      (u) => u.email?.toLowerCase() === email
    )
    if (authUser) {
      const { data: membership } = await supabase
        .from("tenant_users")
        .select("tenant_id, role, tenants(id, name, subscription_status)")
        .eq("user_id", authUser.id)
        .in("role", ["owner", "admin"])
        .limit(1)
        .maybeSingle()

      const tenant = membership?.tenants as
        | { id: string; name: string; subscription_status: string }
        | null
        | undefined

      if (tenant) {
        tenantId = tenant.id
        tenantName = tenant.name
        subscriptionStatus = tenant.subscription_status
      }
    }
  }

  if (tenantId) {
    return {
      status: "linked",
      tenantId,
      tenantName: tenantName ?? undefined,
      subscriptionStatus: subscriptionStatus ?? undefined,
      appUrl: `${appUrl}/dashboard`,
      message: `Tenant vinculado: ${tenantName ?? tenantId}`,
    }
  }

  return {
    status: "pending_signup",
    registerUrl,
    appUrl,
    message:
      "Nenhuma conta Azulli encontrada para este lead. Envie o link de cadastro e converta novamente após o signup.",
  }
}
