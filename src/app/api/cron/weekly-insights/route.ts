/**
 * Vercel Cron — Insights semanais por email (Fase 11D).
 *
 * Disparado por:
 *   • Vercel Cron (configurado no vercel.json — Fase 11F)
 *     ↳ envia header "Authorization: Bearer ${CRON_SECRET}"
 *   • Manualmente em dev: curl /api/cron/weekly-insights?dryRun=1 com header
 *
 * Query params:
 *   • dryRun=1    → gera/renderiza mas NÃO envia email nem atualiza DB
 *   • userId=...  → processa apenas esse user_id (debug)
 *
 * Comportamento:
 *   1. Autentica via CRON_SECRET (header) ou rejeita 401.
 *   2. Lista preferências com weekly_insights_enabled = true.
 *   3. Skip se weekly_insights_last_sent_at < 6 dias (evita duplicado).
 *   4. Pra cada usuário: pega dados (auth + tenant), gera payload,
 *      renderiza email, envia via Resend, loga e atualiza last_sent_at.
 *   5. Rate limit: 250ms entre envios (~4/s — folga sobre o limite de 10/s
 *      do free tier do Resend).
 */

import { NextResponse, type NextRequest } from "next/server"

import { env } from "@/lib/env"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getResendClient, getFromEmail } from "@/lib/email/client"
import { renderWeeklyInsightEmail } from "@/lib/email/render"
import { buildWeeklyInsightPayload } from "@/lib/email/insights"
import { canUseAutomatedEmails, type PlanId } from "@/lib/billing/plans"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5min — limite Vercel Pro; ajuste se mudar

const SEND_INTERVAL_MS = 250
const RESEND_INTERVAL_DAYS = 6

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // 1) Autenticação
  if (!env.CRON_SECRET) {
    return jsonError(503, "CRON_SECRET não configurado no servidor.")
  }
  const authHeader = request.headers.get("authorization")
  const expected = `Bearer ${env.CRON_SECRET}`
  if (authHeader !== expected) {
    return jsonError(401, "Unauthorized.")
  }

  // 2) Query params
  const url = new URL(request.url)
  const dryRun = url.searchParams.get("dryRun") === "1"
  const onlyUserId = url.searchParams.get("userId")

  const resend = getResendClient()
  if (!resend && !dryRun) {
    return jsonError(
      503,
      "RESEND_API_KEY não configurado. Use dryRun=1 pra testar a geração."
    )
  }

  const supabase = createServiceRoleClient()
  const startedAt = Date.now()

  // 3) Carrega preferências elegíveis
  let query = supabase
    .from("email_preferences")
    .select("tenant_id, user_id, weekly_insights_last_sent_at")
    .eq("weekly_insights_enabled", true)

  if (onlyUserId) query = query.eq("user_id", onlyUserId)

  const { data: prefs, error: prefsErr } = await query
  if (prefsErr) {
    console.error("[cron] prefs query failed:", prefsErr)
    return jsonError(500, "Falha ao consultar preferências.")
  }
  if (!prefs || prefs.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      dryRun,
      message: "Nenhum usuário elegível.",
    })
  }

  const cutoffMs = Date.now() - RESEND_INTERVAL_DAYS * 24 * 60 * 60 * 1000

  // 4) Pre-fetch tenants em lote (otimização — evita N+1)
  const tenantIds = [...new Set(prefs.map((p) => p.tenant_id as string))]
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, tier")
    .in("id", tenantIds)
  const tenantById = new Map(
    (tenants ?? []).map((t) => [t.id as string, t.name as string])
  )
  const tierById = new Map(
    (tenants ?? []).map((t) => [t.id as string, t.tier as PlanId])
  )

  // 5) Processa cada usuário
  let sent = 0
  let skipped = 0
  let failed = 0
  const details: ProcessResult[] = []

  for (const pref of prefs) {
    const userId = pref.user_id as string
    const tenantId = pref.tenant_id as string
    const lastSent = pref.weekly_insights_last_sent_at as string | null
    const tier = tierById.get(tenantId)

    if (!tier || !canUseAutomatedEmails(tier)) {
      skipped++
      details.push({
        userId,
        status: "skipped",
        reason: "Plano Pro não inclui e-mails automáticos.",
      })
      continue
    }

    // Dedup: já enviou na janela
    if (
      !dryRun &&
      lastSent &&
      new Date(lastSent).getTime() > cutoffMs
    ) {
      skipped++
      details.push({
        userId,
        status: "skipped",
        reason: "Já enviado recentemente.",
      })
      continue
    }

    const result = await processOne({
      supabase,
      resend,
      dryRun,
      tenantId,
      userId,
      tenantName: tenantById.get(tenantId) ?? "Sua empresa",
    })

    details.push(result)
    if (result.status === "sent") sent++
    else if (result.status === "skipped") skipped++
    else failed++

    // rate limit
    if (!dryRun) await sleep(SEND_INTERVAL_MS)
  }

  return NextResponse.json({
    ok: true,
    processed: prefs.length,
    sent,
    skipped,
    failed,
    dryRun,
    elapsedMs: Date.now() - startedAt,
    details: details.slice(0, 50), // limita resposta
  })
}

// ---------------------------------------------------------------------------
// processOne — pipeline de um único usuário
// ---------------------------------------------------------------------------

type ProcessOneInput = {
  supabase: ReturnType<typeof createServiceRoleClient>
  resend: ReturnType<typeof getResendClient>
  dryRun: boolean
  tenantId: string
  userId: string
  tenantName: string
}

type ProcessResult = {
  userId: string
  status: "sent" | "skipped" | "failed"
  reason?: string
  subject?: string
  providerMessageId?: string
}

async function processOne(input: ProcessOneInput): Promise<ProcessResult> {
  const { supabase, resend, dryRun, tenantId, userId, tenantName } = input

  // a) Auth user (email + nome)
  const { data: userRes, error: userErr } =
    await supabase.auth.admin.getUserById(userId)
  if (userErr || !userRes?.user?.email) {
    return {
      userId,
      status: "failed",
      reason: "Usuário sem email ou inexistente.",
    }
  }
  const userEmail = userRes.user.email
  const meta = (userRes.user.user_metadata ?? {}) as Record<string, unknown>
  const userName = pickFirstName(meta, userEmail)

  try {
    // b) Constrói payload
    const payload = await buildWeeklyInsightPayload({
      tenantId,
      userId,
      userEmail,
      userName,
      tenantName,
    })

    // c) Renderiza
    const rendered = await renderWeeklyInsightEmail(payload)

    // Sem movimentação em 2 semanas E sem alerta → skip pra não poluir inbox
    const isEmpty =
      payload.cards.every((c) => !/[1-9]/.test(c.value)) &&
      !payload.primaryAlert
    if (isEmpty) {
      if (!dryRun) {
        await logEmail(supabase, {
          tenantId,
          userId,
          recipient: userEmail,
          subject: rendered.subject,
          status: "skipped",
          payload,
          errorMessage: "Sem movimentação relevante.",
        })
      }
      return {
        userId,
        status: "skipped",
        reason: "Sem movimentação relevante.",
      }
    }

    if (dryRun) {
      return {
        userId,
        status: "sent",
        reason: "dryRun",
        subject: rendered.subject,
      }
    }

    // d) Envia
    if (!resend) {
      return { userId, status: "failed", reason: "Resend client indisponível." }
    }
    const send = await resend.emails.send({
      from: getFromEmail(),
      to: userEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        "List-Unsubscribe": `<${payload.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    })

    if (send.error || !send.data?.id) {
      const msg = send.error?.message ?? "Erro desconhecido do Resend."
      await logEmail(supabase, {
        tenantId,
        userId,
        recipient: userEmail,
        subject: rendered.subject,
        status: "failed",
        payload,
        errorMessage: msg,
      })
      return { userId, status: "failed", reason: msg, subject: rendered.subject }
    }

    // e) Persiste log + atualiza last_sent_at
    await logEmail(supabase, {
      tenantId,
      userId,
      recipient: userEmail,
      subject: rendered.subject,
      status: "sent",
      providerMessageId: send.data.id,
      payload,
    })

    await supabase
      .from("email_preferences")
      .update({ weekly_insights_last_sent_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)

    return {
      userId,
      status: "sent",
      subject: rendered.subject,
      providerMessageId: send.data.id,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido."
    console.error("[cron] processOne fatal error:", { userId, err })
    if (!dryRun) {
      await logEmail(supabase, {
        tenantId,
        userId,
        recipient: userEmail,
        subject: "(erro antes de renderizar)",
        status: "failed",
        errorMessage: message,
      })
    }
    return { userId, status: "failed", reason: message }
  }
}

// ---------------------------------------------------------------------------
// logEmail — escreve linha no audit log
// ---------------------------------------------------------------------------

type LogInput = {
  tenantId: string
  userId: string
  recipient: string
  subject: string
  status: "sent" | "failed" | "skipped"
  providerMessageId?: string
  payload?: unknown
  errorMessage?: string
}

async function logEmail(
  supabase: ReturnType<typeof createServiceRoleClient>,
  data: LogInput
): Promise<void> {
  const { error } = await supabase.from("email_logs").insert({
    tenant_id: data.tenantId,
    user_id: data.userId,
    kind: "weekly_insights",
    status: data.status,
    recipient_email: data.recipient,
    subject: data.subject,
    provider_message_id: data.providerMessageId ?? null,
    payload: data.payload ?? null,
    error_message: data.errorMessage ?? null,
    sent_at: data.status === "sent" ? new Date().toISOString() : null,
  })
  if (error) {
    console.error("[cron] logEmail failed:", error)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickFirstName(
  meta: Record<string, unknown>,
  email: string
): string {
  const fullName = (meta.full_name ?? meta.name) as string | undefined
  if (fullName && fullName.trim().length > 0) {
    return fullName.trim().split(/\s+/)[0]
  }
  return email.split("@")[0]
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
