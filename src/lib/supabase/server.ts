import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { mergeSupabaseCookieOptions } from "@/lib/supabase/cookie-options"
import { env } from "@/lib/env"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(
                name,
                value,
                mergeSupabaseCookieOptions(options)
              )
            )
          } catch {
            // Chamado a partir de um Server Component — ignorável
            // se o middleware estiver atualizando a sessão.
          }
        },
      },
    }
  )
}