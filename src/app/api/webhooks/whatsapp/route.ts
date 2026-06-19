import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { processInboundWhatsAppMessage } from "@/lib/inbound/process-message"
import { parseWhatsAppWebhook } from "@/lib/whatsapp/webhook-parser"

export const runtime = "nodejs"
export const maxDuration = 60

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

export async function POST(req: NextRequest) {
  const expected =
    process.env.WHATSAPP_WEBHOOK_TOKEN ?? process.env.EVOLUTION_WEBHOOK_TOKEN ?? ""
  const incoming =
    req.headers.get("x-webhook-token") ??
    req.headers.get("apikey") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    ""

  if (!expected || !compareTokens(incoming, expected)) {
    console.warn("[webhook/whatsapp] Token inválido ou ausente")
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new NextResponse("Bad Request", { status: 400 })
  }

  const parsed = parseWhatsAppWebhook(body)
  if (!parsed) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const eventId = parsed.eventId
  const supabase = createServiceRoleClient()

  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id, processed_at")
    .eq("provider", "whatsapp")
    .eq("event_id", eventId)
    .maybeSingle()

  if (existing?.processed_at) {
    return NextResponse.json({ ok: true, idempotent: true })
  }

  if (!existing) {
    await supabase.from("webhook_events").insert({
      provider: "whatsapp",
      event_id: eventId,
      event_type: "message.inbound",
      payload: body,
    })
  }

  try {
    const result = await processInboundWhatsAppMessage(parsed)
    await supabase
      .from("webhook_events")
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq("provider", "whatsapp")
      .eq("event_id", eventId)

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "processing error"
    console.error("[webhook/whatsapp]", message)
    await supabase
      .from("webhook_events")
      .update({ error: message })
      .eq("provider", "whatsapp")
      .eq("event_id", eventId)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
