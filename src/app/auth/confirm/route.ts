import { type EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Rota de confirmação para fluxos de email (recovery, signup, email_change, invite).
 *
 * O Supabase manda emails com links como:
 *   {site_url}/auth/confirm?token_hash=...&type=recovery&next=/reset-password
 *
 * Esta rota:
 *  1. Troca o token_hash por uma sessão válida via verifyOtp
 *  2. Redireciona o usuário para a rota indicada em `next` (ou home)
 *  3. Se falhar, manda pra /forgot-password com erro na URL
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/"

  if (!token_hash || !type) {
    const url = request.nextUrl.clone()
    url.pathname = "/forgot-password"
    url.searchParams.set("error", "missing_params")
    return NextResponse.redirect(url)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    console.error("[auth/confirm] verifyOtp failed:", error.message)
    const url = request.nextUrl.clone()
    url.pathname = "/forgot-password"
    url.searchParams.set("error", "invalid_or_expired")
    return NextResponse.redirect(url)
  }

  // Sessão criada com sucesso — redireciona pra rota final
  const url = request.nextUrl.clone()
  url.pathname = next
  url.search = "" // limpa querystring
  return NextResponse.redirect(url)
}
