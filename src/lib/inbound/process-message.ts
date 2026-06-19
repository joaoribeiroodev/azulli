import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { runInboundSalesAgent } from "@/lib/inbound/sales-agent"
import type { ParsedWhatsAppEvent } from "@/lib/whatsapp/webhook-parser"

export async function processInboundWhatsAppMessage(
  event: ParsedWhatsAppEvent
): Promise<{ leadId: string; skipped: boolean }> {
  if (event.fromMe) {
    return { leadId: "", skipped: true }
  }

  const supabase = createServiceRoleClient()

  const { data: existing } = await supabase
    .from("inbound_leads")
    .select("id, status, name")
    .eq("phone", event.phone)
    .maybeSingle()

  let leadId: string

  if (!existing) {
    const { data: created, error } = await supabase
      .from("inbound_leads")
      .insert({
        phone: event.phone,
        name: event.name,
        status: "NEW_INBOUND",
        utm_source: event.utm?.source ?? null,
        utm_medium: event.utm?.medium ?? null,
        utm_campaign: event.utm?.campaign ?? null,
        utm_content: event.utm?.content ?? null,
      })
      .select("id")
      .single()

    if (error || !created) {
      throw new Error(`[inbound] Falha ao criar lead: ${error?.message}`)
    }
    leadId = created.id
  } else {
    leadId = existing.id
    if (existing.status === "NEW_INBOUND") {
      await supabase
        .from("inbound_leads")
        .update({ status: "IN_NEGOTIATION" })
        .eq("id", leadId)
    }
    if (!existing.name && event.name) {
      await supabase
        .from("inbound_leads")
        .update({ name: event.name })
        .eq("id", leadId)
    }
  }

  await supabase.from("inbound_messages").insert({
    lead_id: leadId,
    sender: "user",
    content: event.text,
  })

  // IA de vendas (não bloqueia webhook se falhar envio WhatsApp depois)
  try {
    await runInboundSalesAgent(leadId)
  } catch (err) {
    console.error("[inbound] sales agent error:", err)
    await supabase.from("inbound_messages").insert({
      lead_id: leadId,
      sender: "system",
      content:
        "Não foi possível gerar resposta automática no momento. Um humano entrará em contato.",
    })
  }

  return { leadId, skipped: false }
}
