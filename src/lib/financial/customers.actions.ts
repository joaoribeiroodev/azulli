"use server"

import { revalidatePath } from "next/cache"
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