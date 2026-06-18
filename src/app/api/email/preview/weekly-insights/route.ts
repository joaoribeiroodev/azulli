/**
 * Preview do email semanal renderizado — abre numa aba pra você ver
 * exatamente o que o cron enviaria. Não dispara email real.
 *
 * Auth: sessão Supabase normal. Cada usuário só preview o próprio.
 */

import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { buildWeeklyInsightPayload } from "@/lib/email/insights"
import { renderWeeklyInsightEmail } from "@/lib/email/render"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const { data: tu } = await supabase
    .from("tenant_users")
    .select("tenant_id, tenants(name)")
    .limit(1)
    .maybeSingle()
  if (!tu) {
    return NextResponse.json(
      { error: "Empresa não encontrada." },
      { status: 404 }
    )
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const fullName = (meta.full_name ?? meta.name) as string | undefined
  const userName =
    fullName?.trim().split(/\s+/)[0] ?? user.email?.split("@")[0] ?? "Você"
  const tenantName =
    ((tu.tenants as { name?: string } | null)?.name ?? "Sua empresa")

  try {
    const payload = await buildWeeklyInsightPayload({
      tenantId: tu.tenant_id as string,
      userId: user.id,
      userEmail: user.email ?? "",
      userName,
      tenantName,
    })
    const rendered = await renderWeeklyInsightEmail(payload)

    return new NextResponse(rendered.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Email-Subject": rendered.subject,
      },
    })
  } catch (err) {
    console.error("[email/preview] failed:", err)
    return NextResponse.json(
      { error: "Falha ao gerar preview." },
      { status: 500 }
    )
  }
}
