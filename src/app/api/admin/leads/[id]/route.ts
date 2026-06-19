import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { LEAD_STATUSES } from "@/lib/admin/leads"
import { requirePlatformAdmin } from "@/lib/admin/platform-admin"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const runtime = "nodejs"

const updateSchema = z.object({
  status: z.enum(LEAD_STATUSES),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const { id } = await params

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("leads")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .select("id, status, updated_at")
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Lead não encontrado." },
      { status: error?.code === "PGRST116" ? 404 : 500 }
    )
  }

  return NextResponse.json({ ok: true, lead: data })
}
