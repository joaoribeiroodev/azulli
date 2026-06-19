import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export type TenantDirectoryRow = {
  id: string
  name: string
  tier: string
  subscriptionStatus: string
  trialEndsAt: string | null
  createdAt: string
  ownerEmail: string | null
  ownerPhone: string | null
  tenantEmail: string | null
  tenantPhone: string | null
}

function digitsOnly(value: string | null | undefined): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, "")
  return digits.length >= 10 ? digits : null
}

function resolvePhone(
  tenantPhone: string | null | undefined,
  settingsPhone: string | null | undefined,
  authUser: { phone?: string; user_metadata?: Record<string, unknown> } | undefined
): string | null {
  const fromTenant = digitsOnly(tenantPhone)
  if (fromTenant) return fromTenant

  const fromSettings = digitsOnly(settingsPhone)
  if (fromSettings) return fromSettings

  if (authUser) {
    const fromAuth = digitsOnly(authUser.phone)
    if (fromAuth) return fromAuth
    const metaPhone = authUser.user_metadata?.phone
    if (typeof metaPhone === "string") {
      const fromMeta = digitsOnly(metaPhone)
      if (fromMeta) return fromMeta
    }
  }

  return null
}

export async function fetchTenantDirectory(): Promise<TenantDirectoryRow[]> {
  const supabase = createServiceRoleClient()

  const [tenantsRes, ownersRes, settingsRes, usersRes] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, name, tier, subscription_status, trial_ends_at, created_at, email, phone")
      .order("created_at", { ascending: false }),
    supabase.from("tenant_users").select("tenant_id, user_id").eq("role", "owner"),
    supabase.from("tenant_settings").select("tenant_id, whatsapp_number"),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const tenants = tenantsRes.data ?? []
  const owners = ownersRes.data ?? []
  const settings = settingsRes.data ?? []
  const authUsers = usersRes.data?.users ?? []

  const userById = new Map(authUsers.map((u) => [u.id, u]))
  const ownerByTenantId = new Map(
    owners.map((o) => [o.tenant_id as string, o.user_id as string])
  )
  const settingsByTenantId = new Map(
    settings.map((s) => [s.tenant_id as string, s.whatsapp_number as string | null])
  )

  return tenants.map((t) => {
    const ownerId = ownerByTenantId.get(t.id as string)
    const owner = ownerId ? userById.get(ownerId) : undefined
    const tenantPhone = (t.phone as string | null) ?? null
    const tenantEmail = (t.email as string | null) ?? null
    const settingsPhone = settingsByTenantId.get(t.id as string) ?? null

    return {
      id: t.id as string,
      name: t.name as string,
      tier: t.tier as string,
      subscriptionStatus: t.subscription_status as string,
      trialEndsAt: (t.trial_ends_at as string) ?? null,
      createdAt: t.created_at as string,
      ownerEmail: owner?.email ?? null,
      ownerPhone: resolvePhone(tenantPhone, settingsPhone, owner),
      tenantEmail,
      tenantPhone,
    }
  })
}

export function filterTrialsEndingSoon(
  rows: TenantDirectoryRow[],
  withinDays = 3
): TenantDirectoryRow[] {
  const now = new Date()
  const limit = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000)

  return rows
    .filter((row) => {
      if (row.tier !== "trial" || !row.trialEndsAt) return false
      const ends = new Date(row.trialEndsAt)
      return ends >= now && ends <= limit
    })
    .sort(
      (a, b) =>
        new Date(a.trialEndsAt!).getTime() - new Date(b.trialEndsAt!).getTime()
    )
}
