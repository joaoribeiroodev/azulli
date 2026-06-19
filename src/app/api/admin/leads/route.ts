import { NextResponse } from "next/server"

import { requirePlatformAdmin } from "@/lib/admin/platform-admin"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const runtime = "nodejs"

export async function GET() {
  const auth = await requirePlatformAdmin()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, name, email, cnpj, status, utm_source, utm_campaign, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ leads: data ?? [] })
}
