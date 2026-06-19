import { NextResponse } from "next/server"

import { requirePlatformAdmin } from "@/lib/admin/platform-admin"
import {
  buildTenantsCsv,
  fetchTenantDirectory,
} from "@/lib/admin/tenant-directory"

export const runtime = "nodejs"

export async function GET() {
  const auth = await requirePlatformAdmin()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  try {
    const rows = await fetchTenantDirectory()
    const csv = buildTenantsCsv(rows)
    const date = new Date().toISOString().slice(0, 10)

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="azulli-empresas-${date}.csv"`,
      },
    })
  } catch (err) {
    console.error("[admin/tenants/export]", err)
    return NextResponse.json(
      { error: "Falha ao exportar empresas." },
      { status: 500 }
    )
  }
}
