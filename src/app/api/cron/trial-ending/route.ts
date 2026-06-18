import { NextResponse, type NextRequest } from "next/server"

import { env } from "@/lib/env"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getResendClient, getFromEmail } from "@/lib/email/client"
import {
  jsonCronError,
  logCronEmail,
  wasEmailSentRecently,
} from "@/lib/email/cron-helpers"
import { renderTrialEndingEmail } from "@/lib/email/render"
import { buildTrialEndingPayload } from "@/lib/email/trial-overdue"

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
  const resend = getResendClient()
  if (!resend && !dryRun) {
    return jsonCronError(503, "RESEND_API_KEY não configurado.")
  }

  const supabase = createServiceRoleClient()
  const now = new Date()
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id, name, trial_ends_at, tier")
    .eq("tier", "trial")
    .gte("trial_ends_at", now.toISOString())
    .lte("trial_ends_at", inThreeDays.toISOString())

  if (error) {
    return jsonCronError(500, "Falha ao consultar tenants.")
  }

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const tenant of tenants ?? []) {
    const { data: owners } = await supabase
      .from("tenant_users")
      .select("user_id")
      .eq("tenant_id", tenant.id)
      .eq("role", "owner")
      .limit(1)

    const ownerId = owners?.[0]?.user_id as string | undefined
    if (!ownerId) continue

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("tenant_id", tenant.id)
      .maybeSingle()
    if (sub?.status === "active" || sub?.status === "pending") {
      skipped++
      continue
    }

    if (await wasEmailSentRecently(supabase, ownerId, "trial_ending", 48)) {
      skipped++
      continue
    }

    const { data: userData } = await supabase.auth.admin.getUserById(ownerId)
    const user = userData?.user
    if (!user?.email) {
      skipped++
      continue
    }

    const meta = user.user_metadata as { name?: string } | undefined
    const payload = await buildTrialEndingPayload({
      tenantId: tenant.id as string,
      userId: ownerId,
      userEmail: user.email,
      userName: meta?.name ?? "",
      tenantName: tenant.name as string,
      trialEndsAt: tenant.trial_ends_at as string,
    })

    const rendered = await renderTrialEndingEmail(payload)

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
    })

    if (send.error || !send.data?.id) {
      failed++
      await logCronEmail(supabase, {
        tenantId: tenant.id as string,
        userId: ownerId,
        kind: "trial_ending",
        recipient: user.email,
        subject: rendered.subject,
        status: "failed",
        errorMessage: send.error?.message,
      })
      continue
    }

    await logCronEmail(supabase, {
      tenantId: tenant.id as string,
      userId: ownerId,
      kind: "trial_ending",
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
    processed: tenants?.length ?? 0,
    sent,
    skipped,
    failed,
    dryRun,
  })
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
