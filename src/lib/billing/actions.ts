"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  createOrGetAsaasCustomer,
  createAsaasSubscription,
  cancelAsaasSubscription,
  getNextAsaasPayment,
  type AsaasBillingType,
} from "@/lib/asaas/client"
import { PLANS } from "@/lib/billing/plans"

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; errorCode?: string }

type SimpleResult = { success: true } | { success: false; error: string }

// ---------------------------------------------------------------------------
// Helper interno
// ---------------------------------------------------------------------------

async function getCurrentTenantData() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, document, email, phone")
    .limit(1)
    .maybeSingle()

  if (!tenant) return null

  return {
    supabase,
    user,
    tenant,
    tenantId: tenant.id as string,
  }
}

// ---------------------------------------------------------------------------
// startSubscriptionAction
// ---------------------------------------------------------------------------

export async function startSubscriptionAction(input: {
  planId: "pro" | "enterprise"
  billingType: "BOLETO" | "PIX" | "CREDIT_CARD" | "UNDEFINED"
}): Promise<ActionResult<{ invoiceUrl: string }>> {
  try {
    const ctx = await getCurrentTenantData()
    if (!ctx) return { success: false, error: "Sessão inválida." }

    const { supabase, user, tenant, tenantId } = ctx

    // Validar CNPJ/CPF
    const cpfCnpj = (tenant.document ?? "").replace(/\D/g, "")
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[billing] document inválido:",
          JSON.stringify(tenant.document),
          "→ digits:",
          cpfCnpj.length
        )
      }
      return {
        success: false,
        error: "Informe o CNPJ/CPF da empresa para continuar.",
        errorCode: "cnpj_required",
      }
    }

    // Verificar subscription existente
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (
      existingSub &&
      (existingSub.status === "active" || existingSub.status === "pending")
    ) {
      return {
        success: false,
        error:
          "Você já tem uma assinatura ativa. Cancele a atual antes de criar outra.",
      }
    }

    // Criar/buscar customer no Asaas
    const ownerName =
      (user.user_metadata?.name as string | undefined) ?? tenant.name
    const ownerEmail = user.email ?? ""
    const ownerPhone =
      (user.user_metadata?.phone as string | undefined) ??
      (tenant.phone as string | null) ??
      undefined

    const customer = await createOrGetAsaasCustomer({
      name: ownerName,
      email: ownerEmail,
      cpfCnpj,
      phone: ownerPhone,
    })

    // Criar subscription no Asaas
    const plan = PLANS[input.planId]
    const subscription = await createAsaasSubscription({
      customerId: customer.id,
      planId: input.planId,
      value: plan.price,
      billingType: input.billingType as AsaasBillingType,
    })

    // Upsert em subscriptions via service role (bypass RLS)
    const serviceRole = createServiceRoleClient()
    const { error: upsertError } = await serviceRole
      .from("subscriptions")
      .upsert(
        {
          tenant_id: tenantId,
          asaas_customer_id: customer.id,
          asaas_subscription_id: subscription.id,
          plan_id: input.planId,
          status: "pending",
          billing_type: input.billingType,
        },
        { onConflict: "tenant_id" }
      )

    if (upsertError) {
      console.error("[billing] upsert subscription failed:", upsertError.message)
      return { success: false, error: "Erro ao registrar assinatura." }
    }

    // Buscar próximo pagamento para obter invoice URL
    const payment = await getNextAsaasPayment(subscription.id)
    if (!payment?.invoiceUrl) {
      return {
        success: false,
        error:
          "Assinatura criada, mas não foi possível obter o link de pagamento. Tente novamente em instantes.",
      }
    }

    revalidatePath("/billing")
    revalidatePath("/configuracoes")

    return { success: true, data: { invoiceUrl: payment.invoiceUrl } }
  } catch (err) {
    console.error("[billing] startSubscriptionAction:", err)
    return {
      success: false,
      error: "Erro ao processar assinatura. Tente novamente.",
    }
  }
}

// ---------------------------------------------------------------------------
// cancelSubscriptionAction
// ---------------------------------------------------------------------------

export async function cancelSubscriptionAction(): Promise<SimpleResult> {
  try {
    const ctx = await getCurrentTenantData()
    if (!ctx) return { success: false, error: "Sessão inválida." }

    const { supabase, tenantId } = ctx

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, asaas_subscription_id, status")
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (!sub) {
      return { success: false, error: "Nenhuma assinatura encontrada." }
    }

    if (sub.status === "canceled") {
      return { success: false, error: "A assinatura já está cancelada." }
    }

    if (sub.asaas_subscription_id) {
      await cancelAsaasSubscription(sub.asaas_subscription_id as string)
    }

    const serviceRole = createServiceRoleClient()
    const { error } = await serviceRole
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)

    if (error) {
      console.error("[billing] cancelSubscription update failed:", error.message)
      return { success: false, error: "Erro ao cancelar assinatura." }
    }

    revalidatePath("/billing")
    revalidatePath("/configuracoes")

    return { success: true }
  } catch (err) {
    console.error("[billing] cancelSubscriptionAction:", err)
    return { success: false, error: "Erro ao cancelar assinatura." }
  }
}

// ---------------------------------------------------------------------------
// changePlanAction
// ---------------------------------------------------------------------------

export async function changePlanAction(input: {
  newPlanId: "pro" | "enterprise"
}): Promise<ActionResult<{ invoiceUrl: string }>> {
  try {
    const ctx = await getCurrentTenantData()
    if (!ctx) return { success: false, error: "Sessão inválida." }

    const { supabase, tenantId } = ctx

    const { data: sub } = await supabase
      .from("subscriptions")
      .select(
        "id, asaas_customer_id, asaas_subscription_id, plan_id, status, billing_type"
      )
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (!sub || sub.status !== "active") {
      return {
        success: false,
        error: "Só é possível trocar de plano com assinatura ativa.",
      }
    }

    // Cancelar atual
    if (sub.asaas_subscription_id) {
      await cancelAsaasSubscription(sub.asaas_subscription_id as string)
    }

    // Criar nova
    const plan = PLANS[input.newPlanId]
    const newSubscription = await createAsaasSubscription({
      customerId: sub.asaas_customer_id as string,
      planId: input.newPlanId,
      value: plan.price,
      billingType: (sub.billing_type ?? "UNDEFINED") as AsaasBillingType,
    })

    const serviceRole = createServiceRoleClient()
    const { error } = await serviceRole
      .from("subscriptions")
      .update({
        asaas_subscription_id: newSubscription.id,
        plan_id: input.newPlanId,
        status: "pending",
        canceled_at: null,
        current_period_start: null,
        current_period_end: null,
      })
      .eq("tenant_id", tenantId)

    if (error) {
      console.error("[billing] changePlan update failed:", error.message)
      return { success: false, error: "Erro ao atualizar plano." }
    }

    const payment = await getNextAsaasPayment(newSubscription.id)
    if (!payment?.invoiceUrl) {
      return {
        success: false,
        error: "Plano alterado, mas não foi possível obter o link de pagamento.",
      }
    }

    revalidatePath("/billing")
    revalidatePath("/configuracoes")

    return { success: true, data: { invoiceUrl: payment.invoiceUrl } }
  } catch (err) {
    console.error("[billing] changePlanAction:", err)
    return { success: false, error: "Erro ao trocar de plano." }
  }
}

// ---------------------------------------------------------------------------
// refreshSubscriptionStatusAction
// ---------------------------------------------------------------------------

export async function refreshSubscriptionStatusAction(): Promise<
  ActionResult<{ invoiceUrl: string | null }>
> {
  try {
    const ctx = await getCurrentTenantData()
    if (!ctx) return { success: false, error: "Sessão inválida." }

    const { supabase, tenantId } = ctx

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("asaas_subscription_id")
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (!sub?.asaas_subscription_id) {
      return { success: true, data: { invoiceUrl: null } }
    }

    const payment = await getNextAsaasPayment(
      sub.asaas_subscription_id as string
    )

    revalidatePath("/billing")

    return { success: true, data: { invoiceUrl: payment?.invoiceUrl ?? null } }
  } catch (err) {
    console.error("[billing] refreshSubscriptionStatusAction:", err)
    return { success: false, error: "Erro ao verificar status." }
  }
}

// ---------------------------------------------------------------------------
// saveCnpjAction — salva o documento (CPF/CNPJ) direto da página de billing
// ---------------------------------------------------------------------------

export async function saveCnpjAction(document: string): Promise<SimpleResult> {
  try {
    const ctx = await getCurrentTenantData()
    if (!ctx) return { success: false, error: "Sessão inválida." }

    const cleaned = document.replace(/\D/g, "")
    if (cleaned.length !== 11 && cleaned.length !== 14) {
      return {
        success: false,
        error:
          "Documento inválido. Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.",
      }
    }

    const { error } = await ctx.supabase
      .from("tenants")
      .update({ document: document.trim() })
      .eq("id", ctx.tenantId)

    if (error) {
      console.error("[billing] saveCnpj:", error.message)
      return { success: false, error: "Não foi possível salvar o documento." }
    }

    revalidatePath("/billing")
    revalidatePath("/configuracoes")
    return { success: true }
  } catch (err) {
    console.error("[billing] saveCnpjAction:", err)
    return { success: false, error: "Erro ao salvar documento." }
  }
}

// ---------------------------------------------------------------------------
// simulatePaymentReceivedAction — APENAS em desenvolvimento
// Remove antes de produção!
// ---------------------------------------------------------------------------

export async function simulatePaymentReceivedAction(
  subscriptionId: string
): Promise<SimpleResult> {
  if (process.env.NODE_ENV !== "development") {
    return { success: false, error: "Não disponível em produção." }
  }

  try {
    const serviceRole = createServiceRoleClient()

    const { data: sub, error: findError } = await serviceRole
      .from("subscriptions")
      .select("id, tenant_id, plan_id")
      .eq("id", subscriptionId)
      .maybeSingle()

    if (findError || !sub) {
      return { success: false, error: "Subscription não encontrada." }
    }

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await serviceRole
      .from("subscriptions")
      .update({
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .eq("id", subscriptionId)

    await serviceRole
      .from("tenants")
      .update({ tier: sub.plan_id })
      .eq("id", sub.tenant_id)

    revalidatePath("/billing")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (err) {
    console.error("[billing] simulatePaymentReceived:", err)
    return { success: false, error: "Erro na simulação." }
  }
}
