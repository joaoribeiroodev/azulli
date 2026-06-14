import { NextResponse } from "next/server"

/**
 * Endpoint de placeholder. Em dev, ao clicar "Baixar XML/PDF" o usuário
 * vê uma mensagem explicando que é mock. Em prod, esta rota não existe —
 * as URLs apontam direto pro CDN do provider.
 */
export async function GET(
  _: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params
  return NextResponse.json(
    {
      message: "Esta é uma nota mock (desenvolvimento).",
      file,
      hint: "Em produção este arquivo viria do provedor de NF (Focus NFe, NotaControl, etc).",
    },
    { status: 200 }
  )
}
