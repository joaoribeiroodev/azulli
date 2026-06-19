import "server-only"

import { PLANS } from "@/lib/billing/plans"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export type RecentTenantRow = {
  id: string
  name: string
  tier: string
  subscriptionStatus: string
  trialEndsAt: string | null
  createdAt: string
  ownerEmail: string | null
}

export type AdminMetrics = {
  product: {
    totalUsers: number
    mau: number
    dau: number
    totalTenants: number
    newTenantsLast7Days: number
    newTenantsLast30Days: number
    planDistribution: Record<string, number>
  }
  subscriptions: {
    active: number
    pastDue: number
    canceled: number
    trialsActive: number
    trialsEndingSoon: number
  }
  financial: {
    mrr: number
    revenueLast30Days: number
    revenueAllTime: number
    churnRate: number | null
  }
  recentTenants: RecentTenantRow[]
  generatedAt: string
}

function planMonthlyPrice(planId: string): number {
  if (planId === "pro") return PLANS.pro.price
  if (planId === "enterprise") return PLANS.enterprise.price
  return 0
}

export async function computeAdminMetrics(): Promise<AdminMetrics> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const trialSoon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const [tenantsRes, subsRes, paymentsRes, usersRes, ownersRes] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, name, tier, subscription_status, trial_ends_at, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("plan_id, status"),
    supabase
      .from("billing_payments")
      .select("amount, paid_at, status")
      .not("paid_at", "is", null),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase
      .from("tenant_users")
      .select("tenant_id, user_id")
      .eq("role", "owner"),
  ])

  const tenants = tenantsRes.data ?? []
  const subs = subsRes.data ?? []
  const payments = paymentsRes.data ?? []
  const authUsers = usersRes.data?.users ?? []
  const owners = ownersRes.data ?? []

  const emailByUserId = new Map(
    authUsers.map((u) => [u.id, u.email ?? null])
  )
  const ownerByTenantId = new Map(
    owners.map((o) => [o.tenant_id as string, o.user_id as string])
  )

  const totalUsers = authUsers.length
  const mau = authUsers.filter((u) => {
    const last = u.last_sign_in_at
    return last && new Date(last) >= monthAgo
  }).length
  const dau = authUsers.filter((u) => {
    const last = u.last_sign_in_at
    return last && new Date(last) >= dayAgo
  }).length

  const planDistribution: Record<string, number> = {}
  for (const t of tenants) {
    const tier = t.tier as string
    planDistribution[tier] = (planDistribution[tier] ?? 0) + 1
  }

  const newTenantsLast7Days = tenants.filter(
    (t) => new Date(t.created_at as string) >= weekAgo
  ).length
  const newTenantsLast30Days = tenants.filter(
    (t) => new Date(t.created_at as string) >= monthAgo
  ).length

  const trialsActive = tenants.filter((t) => t.tier === "trial").length
  const trialsEndingSoon = tenants.filter((t) => {
    if (t.tier !== "trial") return false
    const ends = new Date(t.trial_ends_at as string)
    return ends >= now && ends <= trialSoon
  }).length

  const activeSubs = subs.filter((s) => s.status === "active")
  const mrr = activeSubs.reduce(
    (sum, s) => sum + planMonthlyPrice(s.plan_id as string),
    0
  )

  const confirmedPayments = payments.filter(
    (p) => (p.status as string)?.toUpperCase() === "CONFIRMED" || !p.status
  )

  const revenueAllTime = confirmedPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  )
  const revenueLast30Days = confirmedPayments
    .filter((p) => p.paid_at && new Date(p.paid_at as string) >= monthAgo)
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const canceledSubs = subs.filter((s) => s.status === "canceled").length
  const churnRate = subs.length > 0 ? canceledSubs / subs.length : null

  const recentTenants: RecentTenantRow[] = tenants.slice(0, 12).map((t) => {
    const ownerId = ownerByTenantId.get(t.id as string)
    return {
      id: t.id as string,
      name: t.name as string,
      tier: t.tier as string,
      subscriptionStatus: t.subscription_status as string,
      trialEndsAt: (t.trial_ends_at as string) ?? null,
      createdAt: t.created_at as string,
      ownerEmail: ownerId ? emailByUserId.get(ownerId) ?? null : null,
    }
  })

  return {
    product: {
      totalUsers,
      mau,
      dau,
      totalTenants: tenants.length,
      newTenantsLast7Days,
      newTenantsLast30Days,
      planDistribution,
    },
    subscriptions: {
      active: subs.filter((s) => s.status === "active").length,
      pastDue: subs.filter((s) => s.status === "past_due").length,
      canceled: canceledSubs,
      trialsActive,
      trialsEndingSoon,
    },
    financial: {
      mrr,
      revenueLast30Days,
      revenueAllTime,
      churnRate,
    },
    recentTenants,
    generatedAt: now.toISOString(),
  }
}
