import { NextResponse } from "next/server"

import { buildLgpdExportBundle } from "@/lib/lgpd/export-data"

/**
 * GET /api/export/my-data — exportação LGPD (JSON com dados do usuário e tenant).
 */
export async function GET() {
  const bundle = await buildLgpdExportBundle()
  if (!bundle) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const filename = `azulli_meus_dados_${new Date().toISOString().slice(0, 10)}.json`
  const body = JSON.stringify(bundle, null, 2)

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
