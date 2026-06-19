import "server-only"

import { PLANS } from "@/lib/billing/plans"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export type AdminMetrics = {
  product: {
    totalUsers: number
    mau: number
    dau: number
    planDistribution: Record<string, number>
    totalTenants: number
    activeTenants: number
  }
  financial: {
    grossRevenue: number
    mrr: number
    totalAdSpend: number
    cac: number | null
    roi: number | null
    churnRate: number | null
  }
  marketing: {
    totalInboundLeads: number
    convertedLeads: number
    conversionRate: number | null
    leadsByStatus: Record<string, number>
  }
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
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    tenantsRes,
    subsRes,
    paymentsRes,
    adSpendRes,
    leadsRes,
    usersRes,
  ] = await Promise.all([
    supabase.from("tenants").select("id, tier, subscription_status, created_at"),
    supabase
      .from("subscriptions")
      .select("plan_id, status, tenant_id"),
    supabase
      .from("billing_payments")
      .select("amount, paid_at, status")
      .not("paid_at", "is", null),
    supabase.from("ad_spend").select("amount_spent"),
    supabase.from("inbound_leads").select("id, status"),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const tenants = tenantsRes.data ?? []
  const subs = subsRes.data ?? []
  const payments = paymentsRes.data ?? []
  const adRows = adSpendRes.data ?? []
  const leads = leadsRes.data ?? []
  const authUsers = usersRes.data?.users ?? []

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

  const activeSubs = subs.filter((s) => s.status === "active")
  const mrr = activeSubs.reduce(
    (sum, s) => sum + planMonthlyPrice(s.plan_id as string),
    0
  )

  const grossRevenue = payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  )

  const totalAdSpend = adRows.reduce(
    (sum, r) => sum + Number(r.amount_spent),
    0
  )

  const convertedLeads = leads.filter((l) => l.status === "CONVERTED").length
  const totalInboundLeads = leads.length
  const conversionRate =
    totalInboundLeads > 0 ? convertedLeads / totalInboundLeads : null

  const cac =
    convertedLeads > 0 ? totalAdSpend / convertedLeads : null

  const roi =
    totalAdSpend > 0 ? (grossRevenue - totalAdSpend) / totalAdSpend : null

  const canceledSubs = subs.filter((s) => s.status === "canceled").length
  const churnRate =
    subs.length > 0 ? canceledSubs / subs.length : null

  const leadsByStatus: Record<string, number> = {}
  for (const l of leads) {
    const st = l.status as string
    leadsByStatus[st] = (leadsByStatus[st] ?? 0) + 1
  }

  const activeTenants = tenants.filter(
    (t) =>
      t.subscription_status === "active" ||
      t.tier === "trial" ||
      t.tier === "pro" ||
      t.tier === "enterprise"
  ).length

  return {
    product: {
      totalUsers,
      mau,
      dau,
      planDistribution,
      totalTenants: tenants.length,
      activeTenants,
    },
    financial: {
      grossRevenue,
      mrr,
      totalAdSpend,
      cac,
      roi,
      churnRate,
    },
    marketing: {
      totalInboundLeads,
      convertedLeads,
      conversionRate,
      leadsByStatus,
    },
    generatedAt: now.toISOString(),
  }
}
