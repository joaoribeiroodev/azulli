"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  createGoalSchema,
  updateGoalSchema,
  type CreateGoalInput,
  type UpdateGoalInput,
} from "@/lib/goals/schemas"

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

async function getCurrentTenantId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .limit(1)
    .maybeSingle()
  return data?.tenant_id ?? null
}

function revalidateGoalRoutes() {
  revalidatePath("/metas-e-lembretes")
  revalidatePath("/dashboard")
  revalidatePath("/agenda")
}

export async function createGoalAction(
  input: CreateGoalInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createGoalSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: "Empresa não encontrada." }

  const supabase = await createClient()
  const d = parsed.data

  const { data, error } = await supabase
    .from("goals")
    .insert({
      tenant_id: tenantId,
      title: d.title,
      kind: d.kind,
      target_value: d.target_value,
      current_value: d.kind === "custom" ? d.current_value : 0,
      period_start: d.period_start,
      period_end: d.period_end,
      notes: d.notes || null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[goals] create failed:", error)
    return { success: false, error: "Não foi possível salvar a meta." }
  }

  revalidateGoalRoutes()
  return { success: true, data: { id: data.id } }
}

export async function updateGoalAction(
  input: UpdateGoalInput
): Promise<ActionResult> {
  const parsed = updateGoalSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const { id, ...rest } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from("goals")
    .update({
      title: rest.title,
      kind: rest.kind,
      target_value: rest.target_value,
      current_value: rest.kind === "custom" ? rest.current_value : 0,
      period_start: rest.period_start,
      period_end: rest.period_end,
      notes: rest.notes || null,
      is_archived: rest.is_archived,
    })
    .eq("id", id)

  if (error) {
    console.error("[goals] update failed:", error)
    return { success: false, error: "Não foi possível atualizar a meta." }
  }

  revalidateGoalRoutes()
  return { success: true }
}

export async function deleteGoalAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("goals").delete().eq("id", id)
  if (error) {
    console.error("[goals] delete failed:", error)
    return { success: false, error: "Não foi possível excluir a meta." }
  }
  revalidateGoalRoutes()
  return { success: true }
}

export async function toggleArchiveGoalAction(
  id: string,
  archived: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("goals")
    .update({ is_archived: archived })
    .eq("id", id)
  if (error) {
    return { success: false, error: "Não foi possível arquivar." }
  }
  revalidateGoalRoutes()
  return { success: true }
}

/**
 * Atualiza progresso manual (apenas pra goals do tipo 'custom')
 */
export async function updateCustomProgressAction(
  id: string,
  currentValue: number
): Promise<ActionResult> {
  if (currentValue < 0) {
    return { success: false, error: "Valor não pode ser negativo." }
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from("goals")
    .update({ current_value: currentValue })
    .eq("id", id)
    .eq("kind", "custom")
  if (error) {
    return { success: false, error: "Não foi possível atualizar progresso." }
  }
  revalidateGoalRoutes()
  return { success: true }
}
