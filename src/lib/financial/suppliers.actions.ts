"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  createSupplierSchema,
  type CreateSupplierInput,
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

export async function createSupplierAction(
  input: CreateSupplierInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createSupplierSchema.safeParse(input)
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
    .from("suppliers")
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      document: parsed.data.document || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[suppliers] create failed:", error)
    return { success: false, error: "Não foi possível salvar o fornecedor." }
  }

  revalidatePath("/fornecedores")
  revalidatePath("/lancamentos")
  return { success: true, data: { id: data.id } }
}

const updateSupplierSchema = createSupplierSchema.extend({
  id: z.string().uuid(),
})
type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>

export async function updateSupplierAction(
  input: UpdateSupplierInput
): Promise<ActionResult> {
  const parsed = updateSupplierSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const { id, ...rest } = parsed.data
  const supabase = await createClient()
  const { error } = await supabase
    .from("suppliers")
    .update({
      name: rest.name,
      email: rest.email || null,
      phone: rest.phone || null,
      document: rest.document || null,
      notes: rest.notes || null,
    })
    .eq("id", id)

  if (error) {
    console.error("[suppliers] update failed:", error)
    return { success: false, error: "Não foi possível atualizar o fornecedor." }
  }

  revalidatePath("/fornecedores")
  return { success: true }
}

export async function deleteSupplierAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("suppliers").delete().eq("id", id)
  if (error) {
    console.error("[suppliers] delete failed:", error)
    return {
      success: false,
      error:
        "Não foi possível excluir. Verifique se há lançamentos vinculados.",
    }
  }
  revalidatePath("/fornecedores")
  return { success: true }
}
