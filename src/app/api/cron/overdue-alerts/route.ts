import { NextResponse, type NextRequest } from "next/server"

import { env } from "@/lib/env"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getResendClient, getFromEmail } from "@/lib/email/client"
import {
  jsonCronError,
  logCronEmail,
  wasEmailSentRecently,
} from "@/lib/email/cron-helpers"
import { renderOverdueAlertEmail } from "@/lib/email/render"
import { buildOverdueAlertPayload } from "@/lib/email/trial-overdue"
import { canUseAutomatedEmails, type PlanId } from "@/lib/billing/plans"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const SEND_INTERVAL_MS = 250

export async function GET(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return jsonCronError(503, "CRON_SECRET não configurado.")
  }
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return jsonCronError(401, "Unauthorized.")
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1"
  const onlyUserId = request.nextUrl.searchParams.get("userId")
  const resend = getResendClient()
  if (!resend && !dryRun) {
    return jsonCronError(503, "RESEND_API_KEY não configurado.")
  }

  const supabase = createServiceRoleClient()

  let query = supabase
    .from("email_preferences")
    .select("tenant_id, user_id")
    .eq("overdue_alerts_enabled", true)

  if (onlyUserId) query = query.eq("user_id", onlyUserId)

  const { data: prefs, error: prefsErr } = await query
  if (prefsErr) return jsonCronError(500, "Falha ao consultar preferências.")

  const tenantIds = [...new Set((prefs ?? []).map((p) => p.tenant_id as string))]
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, tier")
    .in("id", tenantIds)
  const tierById = new Map(
    (tenants ?? []).map((t) => [t.id as string, t.tier as PlanId])
  )

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const pref of prefs ?? []) {
    const tenantId = pref.tenant_id as string
    const userId = pref.user_id as string
    const tier = tierById.get(tenantId)

    if (!tier || !canUseAutomatedEmails(tier)) {
      skipped++
      continue
    }

    if (await wasEmailSentRecently(supabase, userId, "overdue_alert", 23)) {
      skipped++
      continue
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle()

    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    const user = userData?.user
    if (!user?.email) {
      skipped++
      continue
    }

    const meta = user.user_metadata as { name?: string } | undefined
    const payload = await buildOverdueAlertPayload({
      tenantId,
      userId,
      userEmail: user.email,
      userName: meta?.name ?? "",
      tenantName: (tenant?.name as string) ?? "Sua empresa",
    })

    if (!payload) {
      skipped++
      continue
    }

    const rendered = await renderOverdueAlertEmail(payload)

    if (dryRun) {
      sent++
      continue
    }

    const send = await resend!.emails.send({
      from: getFromEmail(),
      to: user.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        "List-Unsubscribe": `<${payload.unsubscribeUrl}>`,
      },
    })

    if (send.error || !send.data?.id) {
      failed++
      await logCronEmail(supabase, {
        tenantId,
        userId,
        kind: "overdue_alert",
        recipient: user.email,
        subject: rendered.subject,
        status: "failed",
        errorMessage: send.error?.message,
      })
      continue
    }

    await logCronEmail(supabase, {
      tenantId,
      userId,
      kind: "overdue_alert",
      recipient: user.email,
      subject: rendered.subject,
      status: "sent",
      providerMessageId: send.data.id,
      payload,
    })
    sent++
    await sleep(SEND_INTERVAL_MS)
  }

  return NextResponse.json({
    ok: true,
    processed: prefs?.length ?? 0,
    sent,
    skipped,
    failed,
    dryRun,
  })
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
