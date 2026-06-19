import "server-only"

import { PLANS } from "@/lib/billing/plans"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  fetchTenantDirectory,
  filterTrialsEndingSoon,
  type TenantDirectoryRow,
} from "@/lib/admin/tenant-directory"

export type RecentTenantRow = TenantDirectoryRow

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
  trialsEndingSoon: RecentTenantRow[]
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

  const [directory, subsRes, paymentsRes, usersRes] = await Promise.all([
    fetchTenantDirectory(),
    supabase.from("subscriptions").select("plan_id, status"),
    supabase
      .from("billing_payments")
      .select("amount, paid_at, status")
      .not("paid_at", "is", null),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const subs = subsRes.data ?? []
  const payments = paymentsRes.data ?? []
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
  for (const t of directory) {
    planDistribution[t.tier] = (planDistribution[t.tier] ?? 0) + 1
  }

  const newTenantsLast7Days = directory.filter(
    (t) => new Date(t.createdAt) >= weekAgo
  ).length
  const newTenantsLast30Days = directory.filter(
    (t) => new Date(t.createdAt) >= monthAgo
  ).length

  const trialsActive = directory.filter((t) => t.tier === "trial").length
  const trialsEndingSoonList = filterTrialsEndingSoon(directory, 3)

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

  return {
    product: {
      totalUsers,
      mau,
      dau,
      totalTenants: directory.length,
      newTenantsLast7Days,
      newTenantsLast30Days,
      planDistribution,
    },
    subscriptions: {
      active: subs.filter((s) => s.status === "active").length,
      pastDue: subs.filter((s) => s.status === "past_due").length,
      canceled: canceledSubs,
      trialsActive,
      trialsEndingSoon: trialsEndingSoonList.length,
    },
    financial: {
      mrr,
      revenueLast30Days,
      revenueAllTime,
      churnRate,
    },
    recentTenants: directory.slice(0, 12),
    trialsEndingSoon: trialsEndingSoonList,
    generatedAt: now.toISOString(),
  }
}
