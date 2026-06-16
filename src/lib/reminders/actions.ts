"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  createReminderSchema,
  updateReminderSchema,
  type CreateReminderInput,
  type UpdateReminderInput,
} from "@/lib/reminders/schemas"

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

function revalidateReminderRoutes() {
  revalidatePath("/metas-e-lembretes")
  revalidatePath("/dashboard")
}

export async function createReminderAction(
  input: CreateReminderInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createReminderSchema.safeParse(input)
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
    .from("reminders")
    .insert({
      tenant_id: tenantId,
      title: d.title,
      description: d.description || null,
      due_date: d.due_date,
      priority: d.priority,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[reminders] create failed:", error)
    return { success: false, error: "Não foi possível salvar o lembrete." }
  }

  revalidateReminderRoutes()
  return { success: true, data: { id: data.id } }
}

export async function updateReminderAction(
  input: UpdateReminderInput
): Promise<ActionResult> {
  const parsed = updateReminderSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const { id, ...rest } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from("reminders")
    .update({
      title: rest.title,
      description: rest.description || null,
      due_date: rest.due_date,
      priority: rest.priority,
      is_done: rest.is_done,
    })
    .eq("id", id)

  if (error) {
    console.error("[reminders] update failed:", error)
    return { success: false, error: "Não foi possível atualizar." }
  }

  revalidateReminderRoutes()
  return { success: true }
}

export async function toggleReminderDoneAction(
  id: string,
  done: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("reminders")
    .update({ is_done: done })
    .eq("id", id)

  if (error) {
    return { success: false, error: "Não foi possível atualizar." }
  }
  revalidateReminderRoutes()
  return { success: true }
}

export async function deleteReminderAction(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("reminders").delete().eq("id", id)
  if (error) {
    return { success: false, error: "Não foi possível excluir." }
  }
  revalidateReminderRoutes()
  return { success: true }
}
