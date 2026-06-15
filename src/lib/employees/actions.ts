"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { toE164BR } from "@/lib/utils/format"
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from "@/lib/employees/schemas"

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

function revalidateEmployeeRoutes(id?: string) {
  revalidatePath("/funcionarios")
  if (id) revalidatePath(`/funcionarios/${id}`)
}

export async function createEmployeeAction(
  input: CreateEmployeeInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createEmployeeSchema.safeParse(input)
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
    .from("employees")
    .insert({
      tenant_id: tenantId,
      name: d.name,
      role: d.role || null,
      email: d.email || null,
      phone: d.phone ? toE164BR(d.phone) : null,
      document: d.document || null,
      hire_date: d.hire_date || null,
      salary: d.salary ?? null,
      notes: d.notes || null,
      is_active: d.is_active,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[employees] create failed:", error)
    return {
      success: false,
      error:
        error.code === "23505"
          ? "Já existe um funcionário com esse CPF."
          : "Não foi possível salvar o funcionário.",
    }
  }

  revalidateEmployeeRoutes(data.id)
  return { success: true, data: { id: data.id } }
}

export async function updateEmployeeAction(
  input: UpdateEmployeeInput
): Promise<ActionResult> {
  const parsed = updateEmployeeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const { id, ...rest } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from("employees")
    .update({
      name: rest.name,
      role: rest.role || null,
      email: rest.email || null,
      phone: rest.phone ? toE164BR(rest.phone) : null,
      document: rest.document || null,
      hire_date: rest.hire_date || null,
      salary: rest.salary ?? null,
      notes: rest.notes || null,
      is_active: rest.is_active,
    })
    .eq("id", id)

  if (error) {
    console.error("[employees] update failed:", error)
    return {
      success: false,
      error:
        error.code === "23505"
          ? "Já existe um funcionário com esse CPF."
          : "Não foi possível atualizar o funcionário.",
    }
  }

  revalidateEmployeeRoutes(id)
  return { success: true }
}

export async function deleteEmployeeAction(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("employees").delete().eq("id", id)

  if (error) {
    console.error("[employees] delete failed:", error)
    return { success: false, error: "Não foi possível excluir o funcionário." }
  }

  revalidateEmployeeRoutes()
  return { success: true }
}
