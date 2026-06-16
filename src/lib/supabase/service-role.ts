import "server-only"
import { createClient } from "@supabase/supabase-js"

/**
 * Client Supabase com service role key — bypassa RLS completamente.
 * NUNCA expor pro frontend. Usar apenas em:
 *   - webhook handlers
 *   - scripts de manutenção
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      "[service-role] NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas."
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
