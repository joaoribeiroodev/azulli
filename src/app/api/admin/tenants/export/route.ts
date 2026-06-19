import { NextResponse } from "next/server"

import { requirePlatformAdmin } from "@/lib/admin/platform-admin"
import { fetchTenantDirectory } from "@/lib/admin/tenant-directory"
import {
  buildTenantsXlsxBuffer,
  tenantsExportFilename,
} from "@/lib/admin/tenants-export"

export const runtime = "nodejs"

export async function GET() {
  const auth = await requirePlatformAdmin()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  try {
    const rows = await fetchTenantDirectory()
    const buffer = buildTenantsXlsxBuffer(rows)
    const filename = tenantsExportFilename()

    return new NextResponse(
      new Blob([buffer.slice()], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (err) {
    console.error("[admin/tenants/export]", err)
    return NextResponse.json(
      { error: "Falha ao exportar empresas." },
      { status: 500 }
    )
  }
}
