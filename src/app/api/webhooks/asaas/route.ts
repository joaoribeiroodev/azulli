import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

// ---------------------------------------------------------------------------
// Tipos do payload Asaas
// ---------------------------------------------------------------------------

type AsaasPaymentPayload = {
  id: string
  subscription: string | null
  status: string
  confirmedDate?: string
  dueDate: string
  value: number
}

type AsaasSubscriptionPayload = {
  id: string
  status: string
  externalReference?: string | null
}

type AsaasWebhookBody = {
  id: string
  event: string
  dateCreated: string
  payment?: AsaasPaymentPayload
  subscription?: AsaasSubscriptionPayload
}

// ---------------------------------------------------------------------------
// Helper de comparação timing-safe
// ---------------------------------------------------------------------------

function compareTokens(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Validar origem via token
  const incomingToken = req.headers.get("asaas-access-token") ?? ""
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN ?? ""

  if (!expectedToken || !compareTokens(incomingToken, expectedToken)) {
    console.warn("[webhook/asaas] Token inválido ou ausente")
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // 2. Parse do payload
  let payload: AsaasWebhookBody
  try {
    payload = await req.json()
  } catch {
    return new NextResponse("Bad Request", { status: 400 })
  }

  const eventId = payload.id
  const eventType = payload.event

  if (!eventId || !eventType) {
    return new NextResponse("Bad Request — missing id or event", { status: 400 })
  }

  console.log(`[webhook/asaas] event=${eventType} id=${eventId}`)

  const supabase = createServiceRoleClient()

  // 3. Idempotência — verificar se já processamos este evento
  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id, processed_at")
    .eq("provider", "asaas")
    .eq("event_id", eventId)
    .maybeSingle()

  if (existing) {
    if (existing.processed_at) {
      // Já processado com sucesso — retornar 200 imediatamente
      return NextResponse.json({ ok: true, idempotent: true })
    }
    // Existe mas ainda não foi processado (retry após erro anterior) — continuar
  } else {
    // Registrar evento antes de processar
    const { error: insertError } = await supabase.from("webhook_events").insert({
      provider: "asaas",
      event_id: eventId,
      event_type: eventType,
      payload: payload as unknown as Record<string, unknown>,
      processed_at: null,
    })

    if (insertError) {
      // Pode acontecer race condition — tentar continuar
      console.error("[webhook/asaas] insert webhook_events:", insertError.message)
    }
  }

  // 4. Processar evento
  try {
    await processEvent(supabase, payload)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[webhook/asaas] Erro ao processar ${eventType}:`, errorMsg)

    await supabase
      .from("webhook_events")
      .update({ error: errorMsg })
      .eq("provider", "asaas")
      .eq("event_id", eventId)

    // Retornar 500 para que o Asaas reenvie o webhook
    return new NextResponse("Internal Server Error", { status: 500 })
  }

  // 5. Marcar como processado
  await supabase
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString(), error: null })
    .eq("provider", "asaas")
    .eq("event_id", eventId)

  return NextResponse.json({ ok: true })
}

// ---------------------------------------------------------------------------
// Lógica de processamento por tipo de evento
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processEvent(supabase: any, payload: AsaasWebhookBody) {
  const { event } = payload

  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
      await handlePaymentConfirmed(supabase, payload)
      break

    case "PAYMENT_OVERDUE":
      await handlePaymentOverdue(supabase, payload)
      break

    case "PAYMENT_REFUNDED":
      await handlePaymentRefunded(supabase, payload)
      break

    case "SUBSCRIPTION_DELETED":
      await handleSubscriptionDeleted(supabase, payload)
      break

    default:
      console.log(`[webhook/asaas] Evento ignorado: ${event}`)
  }
}

// ---------------------------------------------------------------------------
// Handlers individuais
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentConfirmed(supabase: any, payload: AsaasWebhookBody) {
  const asaasSubId = payload.payment?.subscription
  if (!asaasSubId) {
    console.warn("[webhook/asaas] PAYMENT_CONFIRMED sem subscription ID")
    return
  }

  const { data: sub, error: findError } = await supabase
    .from("subscriptions")
    .select("id, tenant_id, plan_id")
    .eq("asaas_subscription_id", asaasSubId)
    .maybeSingle()

  if (findError) throw findError
  if (!sub) {
    // Webhook pode ter chegado antes do INSERT — forçar retry
    throw new Error(
      `Subscription Asaas ${asaasSubId} não encontrada. Retry esperado.`
    )
  }

  const confirmedDate =
    payload.payment?.confirmedDate ?? payload.dateCreated ?? new Date().toISOString()

  const periodStart = new Date(confirmedDate)
  const periodEnd = new Date(periodStart)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const { error: subError } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
    })
    .eq("id", sub.id)

  if (subError) throw subError

  const { error: tenantError } = await supabase
    .from("tenants")
    .update({ tier: sub.plan_id })
    .eq("id", sub.tenant_id)

  if (tenantError) throw tenantError

  console.log(
    `[webhook/asaas] CONFIRMED sub=${asaasSubId} tenant=${sub.tenant_id} plan=${sub.plan_id}`
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentOverdue(supabase: any, payload: AsaasWebhookBody) {
  const asaasSubId = payload.payment?.subscription
  if (!asaasSubId) return

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("asaas_subscription_id", asaasSubId)

  if (error) throw error

  console.log(`[webhook/asaas] OVERDUE sub=${asaasSubId}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentRefunded(supabase: any, payload: AsaasWebhookBody) {
  const asaasSubId = payload.payment?.subscription
  if (!asaasSubId) return

  const { data: sub, error: findError } = await supabase
    .from("subscriptions")
    .select("tenant_id")
    .eq("asaas_subscription_id", asaasSubId)
    .maybeSingle()

  if (findError) throw findError
  if (!sub) return

  const { error: subError } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("asaas_subscription_id", asaasSubId)

  if (subError) throw subError

  // Reembolso força bloqueio imediato
  const { error: tenantError } = await supabase
    .from("tenants")
    .update({ tier: "trial", trial_ends_at: new Date().toISOString() })
    .eq("id", sub.tenant_id)

  if (tenantError) throw tenantError

  console.log(`[webhook/asaas] REFUNDED sub=${asaasSubId}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionDeleted(supabase: any, payload: AsaasWebhookBody) {
  const asaasSubId = payload.subscription?.id
  if (!asaasSubId) return

  // Usuário mantém acesso até current_period_end — não alterar tenant.tier aqui
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("asaas_subscription_id", asaasSubId)

  if (error) throw error

  console.log(`[webhook/asaas] SUBSCRIPTION_DELETED sub=${asaasSubId}`)
}
