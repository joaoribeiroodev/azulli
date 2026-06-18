"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

type ActionResult = { success: true } | { success: false; error: string }

const updateSchema = z.object({
  weekly_insights_enabled: z.boolean(),
  collection_reminders_enabled: z.boolean(),
  overdue_alerts_enabled: z.boolean(),
})

export type UpdateEmailPreferencesInput = z.infer<typeof updateSchema>

export async function updateEmailPreferencesAction(
  input: UpdateEmailPreferencesInput
): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Entrada inválida." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Sessão expirada." }

  const { data: tu } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .limit(1)
    .maybeSingle()
  if (!tu) return { success: false, error: "Empresa não encontrada." }

  const { error } = await supabase
    .from("email_preferences")
    .upsert(
      {
        tenant_id: tu.tenant_id,
        user_id: user.id,
        ...parsed.data,
      },
      { onConflict: "tenant_id,user_id" }
    )

  if (error) {
    console.error("[email] updatePreferences failed:", error)
    return { success: false, error: "Não foi possível salvar." }
  }

  revalidatePath("/configuracoes")
  return { success: true }
}
