import { NextResponse } from "next/server"
import { computeAdminMetrics } from "@/lib/admin/metrics"
import { requirePlatformAdmin } from "@/lib/admin/platform-admin"

export const runtime = "nodejs"

export async function GET() {
  const auth = await requirePlatformAdmin()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  try {
    const metrics = await computeAdminMetrics()
    return NextResponse.json(metrics)
  } catch (err) {
    console.error("[admin/metrics]", err)
    return NextResponse.json(
      { error: "Falha ao calcular métricas." },
      { status: 500 }
    )
  }
}
