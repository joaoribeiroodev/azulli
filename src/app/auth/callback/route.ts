import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Callback para confirmação de e-mail / OAuth / magic link.
 * No MVP (email/senha sem confirmação) raramente é chamado,
 * mas deixamos preparado para evitar redirect quebrado caso o
 * Supabase envie e-mails de redefinição de senha etc.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback_failed`)
}