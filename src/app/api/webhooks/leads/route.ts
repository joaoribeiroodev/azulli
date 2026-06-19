import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { compareApiKey } from "@/lib/webhooks/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const runtime = "nodejs"

const leadWebhookSchema = z
  .object({
    nome: z.string().trim().min(1).max(200).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().max(320).optional(),
    cnpj: z.string().trim().max(18).optional(),
    utm_source: z.string().trim().max(200).optional(),
    utm_campaign: z.string().trim().max(200).optional(),
  })
  .refine((data) => Boolean(data.nome || data.name || data.email), {
    message: "Informe pelo menos nome ou e-mail.",
  })
  .refine(
    (data) => !data.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
    { message: "E-mail inválido.", path: ["email"] }
  )

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key") ?? ""
  const expected = process.env.LEADS_WEBHOOK_API_KEY ?? ""

  if (!compareApiKey(apiKey, expected)) {
    console.warn("[webhook/leads] API key inválida ou ausente")
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return new NextResponse("Bad Request", { status: 400 })
  }

  const parsed = leadWebhookSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    )
  }

  const { nome, name, email, cnpj, utm_source, utm_campaign } = parsed.data
  const normalizedEmail = email?.trim() || null

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("leads")
    .insert({
      name: nome ?? name ?? null,
      email: normalizedEmail,
      cnpj: cnpj ?? null,
      utm_source: utm_source ?? null,
      utm_campaign: utm_campaign ?? null,
    })
    .select("id")
    .single()

  if (error || !data) {
    console.error("[webhook/leads] insert error:", error?.message)
    return NextResponse.json(
      { error: error?.message ?? "Falha ao salvar lead." },
      { status: 500 }
    )
  }

  console.log(`[webhook/leads] lead created id=${data.id}`)
  return NextResponse.json({ ok: true, id: data.id })
}
