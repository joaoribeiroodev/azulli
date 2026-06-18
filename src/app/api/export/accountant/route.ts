import { NextResponse } from "next/server"

import { buildAccountantExport } from "@/lib/export/accountant-export"

/**
 * GET /api/export/accountant — pacote Excel + JSON para contador.
 * Query: format=xlsx (default) | json
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const month = url.searchParams.get("month")
  const result = await buildAccountantExport({
    month: month && /^\d{4}-\d{2}$/.test(month) ? month : undefined,
  })
  if (!result) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const format = new URL(request.url).searchParams.get("format")

  if (format === "json") {
    return new NextResponse(result.jsonBody, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.jsonFilename}"`,
        "Cache-Control": "no-store",
      },
    })
  }

  return new NextResponse(
    new Blob([result.buffer.slice()], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    }
  )
}
