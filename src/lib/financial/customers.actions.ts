"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  createCustomerSchema,
  type CreateCustomerInput,
} from "@/lib/financial/schemas"

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

export async function createCustomerAction(
  input: CreateCustomerInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createCustomerSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: "Empresa não encontrada." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      document: parsed.data.document || null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[customers] create failed:", error)
    return { success: false, error: "Não foi possível salvar o cliente." }
  }

  revalidatePath("/clientes")
  revalidatePath("/lancamentos")
  return { success: true, data: { id: data.id } }
}

const updateCustomerSchema = createCustomerSchema.extend({
  id: z.string().uuid(),
})
type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>

export async function updateCustomerAction(
  input: UpdateCustomerInput
): Promise<ActionResult> {
  const parsed = updateCustomerSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const { id, ...rest } = parsed.data
  const supabase = await createClient()
  const { error } = await supabase
    .from("customers")
    .update({
      name: rest.name,
      email: rest.email || null,
      phone: rest.phone || null,
      document: rest.document || null,
    })
    .eq("id", id)

  if (error) {
    console.error("[customers] update failed:", error)
    return { success: false, error: "Não foi possível atualizar o cliente." }
  }

  revalidatePath("/clientes")
  return { success: true }
}

export async function deleteCustomerAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("customers").delete().eq("id", id)
  if (error) {
    console.error("[customers] delete failed:", error)
    return {
      success: false,
      error: "Não foi possível excluir. Verifique se há lançamentos vinculados.",
    }
  }
  revalidatePath("/clientes")
  return { success: true }
}