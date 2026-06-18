import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export type TenantRole = "owner" | "admin" | "member" | "accountant"

export type TenantMember = {
  user_id: string
  role: TenantRole
  email: string | null
  name: string | null
  created_at: string
}

export const getCurrentMembership = cache(async (): Promise<{
  tenant_id: string
  role: TenantRole
} | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("tenant_users")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return {
    tenant_id: data.tenant_id as string,
    role: data.role as TenantRole,
  }
})

export async function listAccountantMembers(): Promise<TenantMember[]> {
  const membership = await getCurrentMembership()
  if (!membership || membership.role !== "owner") return []

  const supabase = await createClient()
  const service = createServiceRoleClient()

  const { data: rows } = await supabase
    .from("tenant_users")
    .select("user_id, role, created_at")
    .eq("role", "accountant")
    .order("created_at", { ascending: false })

  const members: TenantMember[] = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data: userData } = await service.auth.admin.getUserById(
        row.user_id as string
      )
      const u = userData?.user
      return {
        user_id: row.user_id as string,
        role: row.role as TenantRole,
        created_at: row.created_at as string,
        email: u?.email ?? null,
        name: (u?.user_metadata as { name?: string })?.name ?? null,
      }
    })
  )
  return members
}
