import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options"
import { env } from "@/lib/env"

export function createClient() {
  const cookieOptions = getSupabaseCookieOptions()
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    cookieOptions ? { cookieOptions } : undefined
  )
}