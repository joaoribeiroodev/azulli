import "server-only"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

function parseAdminEmails(): Set<string> {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? ""
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  )
}

/**
 * Verifica se o usuário é operador da plataforma (subdomínio admin).
 * Bootstrap via PLATFORM_ADMIN_EMAILS ou registro em platform_admins.
 */
export async function isPlatformAdmin(userId: string, email?: string | null): Promise<boolean> {
  const bootstrap = parseAdminEmails()
  if (email && bootstrap.has(email.toLowerCase())) return true

  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()

  return Boolean(data)
}

export async function requirePlatformAdmin(): Promise<
  { userId: string; email: string } | { error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado." }

  const ok = await isPlatformAdmin(user.id, user.email)
  if (!ok) return { error: "Acesso restrito a administradores da plataforma." }

  return { userId: user.id, email: user.email ?? "" }
}
