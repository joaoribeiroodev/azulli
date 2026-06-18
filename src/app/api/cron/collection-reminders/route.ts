/**
 * Cron diário — Lembretes de cobrança por email (Fase 10).
 *
 * Query: dryRun=1 | userId=...
 * Auth: Bearer CRON_SECRET
 *
 * Envia para usuários com collection_reminders_enabled quando há:
 *   • receitas pendentes vencidas, ou
 *   • receitas pendentes com vencimento em 3 dias
 */

import { NextResponse, type NextRequest } from "next/server"

import { env } from "@/lib/env"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getResendClient, getFromEmail } from "@/lib/email/client"
import { buildCollectionReminderPayload } from "@/lib/email/collection"
import { renderCollectionReminderEmail } from "@/lib/email/render"
import type { EmailKind } from "@/lib/email/types"
import { canUseAutomatedEmails, type PlanId } from "@/lib/billing/plans"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const SEND_INTERVAL_MS = 250
const RESEND_INTERVAL_HOURS = 23

export async function GET(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return jsonError(503, "CRON_SECRET não configurado no servidor.")
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return jsonError(401, "Unauthorized.")
  }

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
  const cutoffMs = Date.now() - RESEND_INTERVAL_HOURS * 60 * 60 * 1000

  let query = supabase
    .from("email_preferences")
    .select("tenant_id, user_id")
    .eq("collection_reminders_enabled", true)

  if (onlyUserId) query = query.eq("user_id", onlyUserId)

  const { data: prefs, error: prefsErr } = await query
  if (prefsErr) {
    console.error("[cron/collection] prefs failed:", prefsErr)
    return jsonError(500, "Falha ao consultar preferências.")
  }

  if (!prefs?.length) {
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

  let sent = 0
  let skipped = 0
  let failed = 0
  const details: Array<{
    userId: string
    status: "sent" | "skipped" | "failed"
    reason?: string
    subject?: string
  }> = []

  for (const pref of prefs) {
    const userId = pref.user_id as string
    const tenantId = pref.tenant_id as string
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

    if (!dryRun && await wasSentRecently(supabase, userId, cutoffMs)) {
      skipped++
      details.push({
        userId,
        status: "skipped",
        reason: "Já enviado hoje.",
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
    details: details.slice(0, 50),
  })
}

async function processOne(input: {
  supabase: ReturnType<typeof createServiceRoleClient>
  resend: ReturnType<typeof getResendClient>
  dryRun: boolean
  tenantId: string
  userId: string
  tenantName: string
}) {
  const { supabase, resend, dryRun, tenantId, userId, tenantName } = input

  const { data: userRes, error: userErr } =
    await supabase.auth.admin.getUserById(userId)
  if (userErr || !userRes?.user?.email) {
    return {
      userId,
      status: "failed" as const,
      reason: "Usuário sem email ou inexistente.",
    }
  }

  const userEmail = userRes.user.email
  const meta = (userRes.user.user_metadata ?? {}) as Record<string, unknown>
  const userName = pickFirstName(meta, userEmail)

  try {
    const payload = await buildCollectionReminderPayload({
      tenantId,
      userId,
      userName,
      tenantName,
    })

    if (!payload) {
      if (!dryRun) {
        await logEmail(supabase, {
          tenantId,
          userId,
          recipient: userEmail,
          subject: "(sem cobranças pendentes)",
          status: "skipped",
          errorMessage: "Nada a cobrar hoje.",
        })
      }
      return {
        userId,
        status: "skipped" as const,
        reason: "Nada a cobrar hoje.",
      }
    }

    const rendered = await renderCollectionReminderEmail(payload)

    if (dryRun) {
      return {
        userId,
        status: "sent" as const,
        reason: "dryRun",
        subject: rendered.subject,
      }
    }

    if (!resend) {
      return {
        userId,
        status: "failed" as const,
        reason: "Resend indisponível.",
      }
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
      const msg = send.error?.message ?? "Erro do Resend."
      await logEmail(supabase, {
        tenantId,
        userId,
        recipient: userEmail,
        subject: rendered.subject,
        status: "failed",
        payload,
        errorMessage: msg,
      })
      return {
        userId,
        status: "failed" as const,
        reason: msg,
        subject: rendered.subject,
      }
    }

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
      .update({ collection_reminders_last_sent_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      // Coluna opcional até migration 00020 — ignora se ainda não existe

    return {
      userId,
      status: "sent" as const,
      subject: rendered.subject,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido."
    console.error("[cron/collection] processOne:", { userId, err })
    return { userId, status: "failed" as const, reason: message }
  }
}

async function logEmail(
  supabase: ReturnType<typeof createServiceRoleClient>,
  data: {
    tenantId: string
    userId: string
    recipient: string
    subject: string
    status: "sent" | "failed" | "skipped"
    providerMessageId?: string
    payload?: unknown
    errorMessage?: string
  }
) {
  const { error } = await supabase.from("email_logs").insert({
    tenant_id: data.tenantId,
    user_id: data.userId,
    kind: "collection_reminder" as EmailKind,
    status: data.status,
    recipient_email: data.recipient,
    subject: data.subject,
    provider_message_id: data.providerMessageId ?? null,
    payload: data.payload ?? null,
    error_message: data.errorMessage ?? null,
    sent_at: data.status === "sent" ? new Date().toISOString() : null,
  })
  if (error) console.error("[cron/collection] logEmail failed:", error)
}

function pickFirstName(meta: Record<string, unknown>, email: string): string {
  const fullName = (meta.full_name ?? meta.name) as string | undefined
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0]
  return email.split("@")[0]
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function wasSentRecently(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  sinceMs: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from("email_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "collection_reminder")
    .eq("status", "sent")
    .gte("sent_at", new Date(sinceMs).toISOString())
    .limit(1)

  if (error) {
    console.error("[cron/collection] dedup check failed:", error)
    return false
  }
  return (data?.length ?? 0) > 0
}
