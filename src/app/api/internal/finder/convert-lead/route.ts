import { NextResponse } from "next/server"

import {
  convertFinderLead,
  type ConvertFinderLeadInput,
} from "@/lib/finder/convert-lead"

function validateApiKey(request: Request): boolean {
  const expected = process.env.FINDER_API_KEY?.trim()
  if (!expected) return false

  const auth = request.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7) === expected
  }

  const header = request.headers.get("x-finder-api-key")
  return header === expected
}

export async function POST(request: Request) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { erro: "API key inválida ou não configurada." },
      { status: 401 }
    )
  }

  let body: Partial<ConvertFinderLeadInput>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 })
  }

  const { finderLeadId, nome, plano } = body
  if (!finderLeadId || !nome || !plano) {
    return NextResponse.json(
      { erro: "finderLeadId, nome e plano são obrigatórios." },
      { status: 400 }
    )
  }

  if (plano !== "pro" && plano !== "enterprise") {
    return NextResponse.json(
      { erro: "plano deve ser pro ou enterprise." },
      { status: 400 }
    )
  }

  try {
    const result = await convertFinderLead({
      finderLeadId,
      nome,
      plano,
      email: body.email ?? null,
      telefone: body.telefone ?? null,
      cnpj: body.cnpj ?? null,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error("[finder/convert-lead]", err)
    return NextResponse.json(
      { erro: "Falha ao processar conversão." },
      { status: 500 }
    )
  }
}
