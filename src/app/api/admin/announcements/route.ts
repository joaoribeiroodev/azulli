import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePlatformAdmin } from "@/lib/admin/platform-admin"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const runtime = "nodejs"

const createSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
  priority: z.enum(["low", "normal", "high"]).optional(),
  audience: z.enum(["all", "trial", "pro", "enterprise"]).optional(),
  expires_at: z.string().datetime().optional().nullable(),
})

export async function GET() {
  const auth = await requirePlatformAdmin()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("system_announcements")
    .select("id, title, body, priority, audience, published_at, expires_at, created_at")
    .order("published_at", { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ announcements: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("system_announcements")
    .insert({
      title: parsed.data.title,
      body: parsed.data.body,
      priority: parsed.data.priority ?? "normal",
      audience: parsed.data.audience ?? "all",
      expires_at: parsed.data.expires_at ?? null,
      created_by: auth.userId,
    })
    .select("id")
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Falha ao criar aviso." },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, id: data.id })
}
