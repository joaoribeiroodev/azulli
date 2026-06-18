import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { generateUserManualPdf } from "@/lib/docs/generate-manual-pdf"

/**
 * GET /api/export/manual
 *
 * Download do manual de uso em PDF (autenticado).
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const pdf = await generateUserManualPdf()

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=\"manual-azulli.pdf\"",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err) {
    console.error("[export/manual] PDF generation failed:", err)
    return NextResponse.json(
      { error: "Não foi possível gerar o PDF. Tente novamente." },
      { status: 500 }
    )
  }
}
