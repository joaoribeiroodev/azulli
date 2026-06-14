"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "@/lib/financial/schemas"

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

async function getCurrentTenantId(): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data.tenant_id
}

export async function createTransactionAction(
  input: CreateTransactionInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTransactionSchema.safeParse(input)
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
    .from("transactions")
    .insert({
      tenant_id: tenantId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      due_date: parsed.data.due_date,
      description: parsed.data.description || null,
      customer_id:
        parsed.data.type === "income" ? parsed.data.customer_id || null : null,
      supplier_id:
        parsed.data.type === "expense" ? parsed.data.supplier_id || null : null,
      status: parsed.data.status,
      paid_at: parsed.data.status === "paid" ? new Date().toISOString() : null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[transactions] create failed:", error)
    return { success: false, error: "Não foi possível salvar o lançamento." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/lancamentos")
  return { success: true, data: { id: data.id } }
}

export async function updateTransactionAction(
  input: UpdateTransactionInput
): Promise<ActionResult> {
  const parsed = updateTransactionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const { id, status, type, customer_id, supplier_id, ...rest } = parsed.data
  const supabase = await createClient()

  const updates: Record<string, unknown> = { ...rest }
  if (type) updates.type = type

  // Se mudou o type, força limpar a parte que não combina
  if (type === "income") {
    updates.customer_id = customer_id ?? null
    updates.supplier_id = null
  } else if (type === "expense") {
    updates.supplier_id = supplier_id ?? null
    updates.customer_id = null
  } else {
    // type não foi enviado — só atualiza o lado que foi enviado
    if (customer_id !== undefined) updates.customer_id = customer_id
    if (supplier_id !== undefined) updates.supplier_id = supplier_id
  }

  if (status) {
    updates.status = status
    updates.paid_at = status === "paid" ? new Date().toISOString() : null
  }

  const { error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)

  if (error) {
    console.error("[transactions] update failed:", error)
    return { success: false, error: "Não foi possível atualizar." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/lancamentos")
  return { success: true }
}

export async function markAsPaidAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("transactions")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("[transactions] markAsPaid failed:", error)
    return { success: false, error: "Não foi possível marcar como pago." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/lancamentos")
  return { success: true }
}

export async function deleteTransactionAction(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Bloqueia exclusão se já existir invoice emitida (registro fiscal)
  const { data: invoices, error: invErr } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("transaction_id", id)
    .limit(1)

  if (invErr) {
    console.error("[transactions] invoice check failed:", invErr)
    return { success: false, error: "Erro ao verificar notas vinculadas." }
  }

  if (invoices && invoices.length > 0) {
    return {
      success: false,
      error:
        "Este lançamento já tem nota fiscal emitida e não pode ser excluído. Cancele a nota antes.",
    }
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id)
  if (error) {
    console.error("[transactions] delete failed:", error)
    return { success: false, error: "Não foi possível excluir o lançamento." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/lancamentos")
  return { success: true }
}
