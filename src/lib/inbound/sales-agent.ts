import "server-only"

import { callOpenAIChat, type ChatMessage } from "@/lib/ai/openai"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendWhatsAppText } from "@/lib/whatsapp/api-client"

const SYSTEM_PROMPT = `Você é uma consultora de vendas empática do Azulli, um SaaS de gestão financeira para MEIs e pequenas empresas no Brasil.

Objetivo: entender as dores de gestão do lead (caixa, lançamentos, clientes, impostos, tempo) com perguntas curtas e naturais. Não seja robótica.

Quando o lead demonstrar interesse real ou pedir preço/como funciona, envie o link de cadastro/checkout:
${process.env.NEXT_PUBLIC_APP_URL ?? "https://use.azulli.app.br"}/register

Regras:
- Respostas curtas (2-4 frases), em português brasileiro.
- Uma pergunta por mensagem quando possível.
- Não invente funcionalidades que o Azulli não tem.
- Se o lead já está convertido, agradeça e ofereça suporte pelo app.`

export async function runInboundSalesAgent(leadId: string): Promise<void> {
  const supabase = createServiceRoleClient()

  const { data: lead } = await supabase
    .from("inbound_leads")
    .select("id, phone, name, status")
    .eq("id", leadId)
    .maybeSingle()

  if (!lead) return

  const { data: history } = await supabase
    .from("inbound_messages")
    .select("sender, content")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true })
    .limit(40)

  const chatMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ]

  if (lead.name) {
    chatMessages.push({
      role: "system",
      content: `Nome do lead: ${lead.name}`,
    })
  }

  for (const row of history ?? []) {
    if (row.sender === "user") {
      chatMessages.push({ role: "user", content: row.content })
    } else if (row.sender === "ai") {
      chatMessages.push({ role: "assistant", content: row.content })
    }
  }

  const reply = await callOpenAIChat(chatMessages)

  await supabase.from("inbound_messages").insert({
    lead_id: leadId,
    sender: "ai",
    content: reply,
  })

  await sendWhatsAppText({ phone: lead.phone, message: reply })
}
