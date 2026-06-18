/**
 * One-click unsubscribe (RFC 8058) + link do corpo do email.
 *
 * GET  ?token=... → desativa preferência e mostra página de confirmação
 * POST ?token=... + header List-Unsubscribe=One-Click → 200 sem HTML
 */

import { NextResponse, type NextRequest } from "next/server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  verifyUnsubscribeToken,
  unsubscribePrefField,
  type UnsubscribeKind,
} from "@/lib/email/unsubscribe-token"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const KIND_LABELS: Record<UnsubscribeKind, string> = {
  weekly_insights: "Insights semanais",
  collection_reminder: "Lembretes de cobrança",
  overdue_alert: "Alertas de vencidos",
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  if (!token) {
    return htmlResponse("Link inválido", "Token não encontrado.", 400)
  }

  const payload = verifyUnsubscribeToken(token)
  if (!payload) {
    return htmlResponse(
      "Link expirado",
      "Este link de descadastro não é válido ou já expirou.",
      400
    )
  }

  const ok = await disablePreference(payload)
  if (!ok) {
    return htmlResponse(
      "Erro",
      "Não conseguimos atualizar suas preferências. Tente em Configurações → Notificações.",
      500
    )
  }

  return htmlResponse(
    "Pronto!",
    `Você não receberá mais <strong>${KIND_LABELS[payload.kind]}</strong> por email.`,
    200
  )
}

export async function POST(request: NextRequest) {
  const token =
    request.nextUrl.searchParams.get("token") ??
    new URL(request.url).searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "Token inválido." }, { status: 400 })
  }

  const payload = verifyUnsubscribeToken(token)
  if (!payload) {
    return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 400 })
  }

  const ok = await disablePreference(payload)
  if (!ok) {
    return NextResponse.json({ error: "Falha ao salvar." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

async function disablePreference(payload: {
  userId: string
  tenantId: string
  kind: UnsubscribeKind
}): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const field = unsubscribePrefField(payload.kind)

  const { error } = await supabase
    .from("email_preferences")
    .update({ [field]: false })
    .eq("tenant_id", payload.tenantId)
    .eq("user_id", payload.userId)

  if (error) {
    console.error("[email/unsubscribe] update failed:", error)
    return false
  }
  return true
}

function htmlResponse(title: string, body: string, status: number) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — Azulli</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a;
      display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 2rem; max-width: 420px; text-align: center; }
    h1 { font-size: 1.25rem; margin: 0 0 0.75rem; color: #1e3a8a; }
    p { font-size: 0.95rem; color: #64748b; line-height: 1.5; margin: 0; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${body}</p>
    <p style="margin-top:1.25rem"><a href="/configuracoes?tab=notificacoes">Gerenciar notificações</a></p>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
