import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { getNextAsaasPayment } from "@/lib/asaas/client"

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type BillingState = {
  tenant_tier: "trial" | "pro" | "enterprise"
  trial_ends_at: string | null

  subscription_id: string | null
  subscription_status:
    | "pending"
    | "active"
    | "past_due"
    | "canceled"
    | "trial_expired"
    | null
  plan_id: "pro" | "enterprise" | null
  current_period_start: string | null
  current_period_end: string | null
  canceled_at: string | null
  billing_type: string | null

  effective_status:
    | "trial_active"
    | "trial_expired"
    | "pending"
    | "active"
    | "past_due"
    | "canceled"
    | "no_subscription"
  trial_days_left: number | null
  needs_action: boolean
  invoice_url: string | null
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

type TenantRow = {
  tier: "trial" | "pro" | "enterprise"
  trial_ends_at: string | null
}

type SubscriptionRow = {
  id: string
  status: string
  plan_id: string
  current_period_start: string | null
  current_period_end: string | null
  canceled_at: string | null
  billing_type: string | null
  asaas_subscription_id: string | null
}

function computeEffectiveStatus(
  tenant: TenantRow,
  sub: SubscriptionRow | null
): BillingState["effective_status"] {
  if (sub) {
    if (sub.status === "active") return "active"
    if (sub.status === "pending") return "pending"
    if (sub.status === "past_due") return "past_due"

    if (sub.status === "canceled") {
      // Período pago ainda vigente → mostra como "canceled" (UI exibe data de acesso)
      if (
        sub.current_period_end &&
        new Date(sub.current_period_end) > new Date()
      ) {
        return "canceled"
      }
      // Nunca pagou ou período expirado → trata como se não houvesse subscription
      // para que o trial (se ativo) seja a fonte de acesso
    }
    // Outros statuses desconhecidos → fallback para trial
  }

  if (tenant.trial_ends_at) {
    return new Date(tenant.trial_ends_at) > new Date()
      ? "trial_active"
      : "trial_expired"
  }

  return "no_subscription"
}

function buildState(
  tenant: TenantRow,
  sub: SubscriptionRow | null,
  invoiceUrl: string | null
): BillingState {
  const effectiveStatus = computeEffectiveStatus(tenant, sub)

  let trialDaysLeft: number | null = null
  if (effectiveStatus === "trial_active" && tenant.trial_ends_at) {
    const end = new Date(tenant.trial_ends_at)
    trialDaysLeft = Math.max(
      0,
      Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    )
  }

  return {
    tenant_tier: tenant.tier,
    trial_ends_at: tenant.trial_ends_at,

    subscription_id: sub?.id ?? null,
    subscription_status: sub
      ? (sub.status as BillingState["subscription_status"])
      : null,
    plan_id: sub ? (sub.plan_id as "pro" | "enterprise") : null,
    current_period_start: sub?.current_period_start ?? null,
    current_period_end: sub?.current_period_end ?? null,
    canceled_at: sub?.canceled_at ?? null,
    billing_type: sub?.billing_type ?? null,

    effective_status: effectiveStatus,
    trial_days_left: trialDaysLeft,
    needs_action:
      effectiveStatus === "past_due" || effectiveStatus === "trial_expired",
    invoice_url: invoiceUrl,
  }
}

// ---------------------------------------------------------------------------
// getBillingStateLight — sem chamar Asaas (middleware, layouts)
// ---------------------------------------------------------------------------

export const getBillingStateLight = cache(async (): Promise<BillingState | null> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [tenantRes, subRes] = await Promise.all([
    supabase
      .from("tenants")
      .select("tier, trial_ends_at")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select(
        "id, status, plan_id, current_period_start, current_period_end, canceled_at, billing_type, asaas_subscription_id"
      )
      .limit(1)
      .maybeSingle(),
  ])

  if (!tenantRes.data) return null

  return buildState(
    tenantRes.data as TenantRow,
    (subRes.data as SubscriptionRow | null) ?? null,
    null
  )
})

// ---------------------------------------------------------------------------
// getBillingStateFull — com invoice URL do Asaas (apenas página /billing)
// ---------------------------------------------------------------------------

export async function getBillingStateFull(): Promise<BillingState | null> {
  const state = await getBillingStateLight()
  if (!state) return null

  if (
    (state.subscription_status === "pending" ||
      state.subscription_status === "past_due") &&
    state.subscription_id
  ) {
    try {
      const supabase = await createClient()
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("asaas_subscription_id")
        .eq("id", state.subscription_id)
        .maybeSingle()

      if (sub?.asaas_subscription_id) {
        const payment = await getNextAsaasPayment(
          sub.asaas_subscription_id as string
        )
        if (payment?.invoiceUrl) {
          return { ...state, invoice_url: payment.invoiceUrl }
        }
      }
    } catch (err) {
      console.error("[billing] getBillingStateFull Asaas call failed:", err)
    }
  }

  return state
}

// ---------------------------------------------------------------------------
// hasActiveAccess — conveniência para middleware e guards
// ---------------------------------------------------------------------------

export async function hasActiveAccess(): Promise<boolean> {
  const state = await getBillingStateLight()
  if (!state) return false

  switch (state.effective_status) {
    case "trial_active":
    case "active":
    case "pending":
      return true

    case "past_due": {
      if (!state.current_period_end) return false
      const end = new Date(state.current_period_end)
      const graceEnd = new Date(end.getTime() + 7 * 24 * 60 * 60 * 1000)
      return new Date() <= graceEnd
    }

    case "canceled":
      // effective_status só chega aqui como "canceled" quando current_period_end
      // está no futuro (veja computeEffectiveStatus). Garantia dupla:
      return !!state.current_period_end && new Date(state.current_period_end) > new Date()

    default:
      return false
  }
}
