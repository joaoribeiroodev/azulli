"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "@/lib/financial/schemas"
import { applyStockMovement } from "@/lib/products/actions"

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

function normalizeCategory(c?: string | null): string | null {
  if (!c) return null
  const trimmed = c.trim()
  return trimmed.length > 0 ? trimmed : null
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
  const d = parsed.data

  // Determina o amount final
  const hasItems = d.items && d.items.length > 0
  let finalAmount = d.amount
  if (hasItems) {
    finalAmount = d.items!.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    )
  }

  // Cria a transaction principal
  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .insert({
      tenant_id: tenantId,
      type: d.type,
      amount: finalAmount,
      due_date: d.due_date,
      description: d.description || null,
      customer_id: d.type === "income" ? d.customer_id || null : null,
      supplier_id: d.type === "expense" ? d.supplier_id || null : null,
      product_id: hasItems ? null : d.product_id || null,
      category: normalizeCategory(d.category),
      status: d.status,
      paid_at: d.status === "paid" ? new Date().toISOString() : null,
    })
    .select("id")
    .single()

  if (txErr || !tx) {
    console.error("[transactions] create failed:", txErr)
    return { success: false, error: "Não foi possível salvar o lançamento." }
  }

  // Insere items (se for multi-item)
  if (hasItems) {
    const itemsToInsert = d.items!.map((item) => ({
      tenant_id: tenantId,
      transaction_id: tx.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }))

    const { data: insertedItems, error: itemsErr } = await supabase
      .from("transaction_items")
      .insert(itemsToInsert)
      .select("id, product_id, quantity")

    if (itemsErr) {
      console.error("[transactions] items insert failed:", itemsErr)
      // Rollback simples
      await supabase.from("transactions").delete().eq("id", tx.id)
      return {
        success: false,
        error: "Não foi possível salvar os itens da venda.",
      }
    }

    // Aplica estoque se status=paid e for venda
    if (d.status === "paid" && d.type === "income") {
      for (const item of insertedItems ?? []) {
        await applyStockMovement(supabase, {
          tenantId,
          productId: item.product_id,
          kind: "sale",
          quantity: Number(item.quantity),
          transactionId: tx.id,
          transactionItemId: item.id,
        })
      }
    }
    // Se for compra (expense + items) e status paid, aplica entrada
    if (d.status === "paid" && d.type === "expense") {
      for (const item of insertedItems ?? []) {
        await applyStockMovement(supabase, {
          tenantId,
          productId: item.product_id,
          kind: "purchase",
          quantity: Number(item.quantity),
          transactionId: tx.id,
          transactionItemId: item.id,
        })
      }
    }
  }
  // Se for single-product e status=paid, aplica estoque
  else if (d.product_id && d.status === "paid") {
    const isOutflow = d.type === "income"
    await applyStockMovement(supabase, {
      tenantId,
      productId: d.product_id,
      kind: isOutflow ? "sale" : "purchase",
      quantity: 1, // single-product = 1 unidade
      transactionId: tx.id,
    })
  }

  revalidatePath("/dashboard")
  revalidatePath("/lancamentos")
  revalidatePath("/agenda")
  revalidatePath("/clientes")
  revalidatePath("/fornecedores")
  revalidatePath("/funcionarios")
  revalidatePath("/produtos")
  return { success: true, data: { id: tx.id } }
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

  const { id, status, type, customer_id, supplier_id, product_id, category, ...rest } =
    parsed.data
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("transactions")
    .select("customer_id, supplier_id")
    .eq("id", id)
    .maybeSingle()

  const updates: Record<string, unknown> = { ...rest }
  if (type) updates.type = type

  if (type === "income") {
    updates.customer_id = customer_id ?? null
    updates.supplier_id = null
  } else if (type === "expense") {
    updates.supplier_id = supplier_id ?? null
    updates.customer_id = null
  } else {
    if (customer_id !== undefined) updates.customer_id = customer_id
    if (supplier_id !== undefined) updates.supplier_id = supplier_id
  }

  if (product_id !== undefined) {
    updates.product_id = product_id
  }

  if (category !== undefined) {
    updates.category = normalizeCategory(category)
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
  revalidatePath("/agenda")
  revalidatePath("/clientes")
  revalidatePath("/fornecedores")
  if (existing?.customer_id) {
    revalidatePath(`/clientes/${existing.customer_id}`)
  }
  if (existing?.supplier_id) {
    revalidatePath(`/fornecedores/${existing.supplier_id}`)
  }
  if (customer_id) {
    revalidatePath(`/clientes/${customer_id}`)
  }
  if (supplier_id) {
    revalidatePath(`/fornecedores/${supplier_id}`)
  }
  return { success: true }
}

export async function markAsPaidAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: "Empresa não encontrada." }

  // Pega a transaction com items pra aplicar estoque corretamente
  const { data: tx } = await supabase
    .from("transactions")
    .select("id, type, product_id, status")
    .eq("id", id)
    .maybeSingle()

  if (!tx) return { success: false, error: "Lançamento não encontrado." }
  if (tx.status === "paid") {
    return { success: false, error: "Lançamento já está pago." }
  }

  const { error } = await supabase
    .from("transactions")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("[transactions] markAsPaid failed:", error)
    return { success: false, error: "Não foi possível marcar como pago." }
  }

  // Aplica estoque após confirmar pagamento
  const { data: items } = await supabase
    .from("transaction_items")
    .select("id, product_id, quantity")
    .eq("transaction_id", id)

  if (items && items.length > 0) {
    const kind = tx.type === "income" ? "sale" : "purchase"
    for (const item of items) {
      await applyStockMovement(supabase, {
        tenantId,
        productId: item.product_id,
        kind,
        quantity: Number(item.quantity),
        transactionId: id,
        transactionItemId: item.id,
      })
    }
  } else if (tx.product_id) {
    await applyStockMovement(supabase, {
      tenantId,
      productId: tx.product_id,
      kind: tx.type === "income" ? "sale" : "purchase",
      quantity: 1,
      transactionId: id,
    })
  }

  revalidatePath("/dashboard")
  revalidatePath("/lancamentos")
  revalidatePath("/agenda")
  revalidatePath("/produtos")
  return { success: true }
}

export async function deleteTransactionAction(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Os items são deletados em cascade pela FK ON DELETE CASCADE.
  // Estoque NÃO é revertido automaticamente (decisão consciente:
  // log permanece pra auditoria; revertê-lo viraria movimento contrário
  // que confundiria histórico). Se quiserem reverter, fazem manual.
  const { error } = await supabase.from("transactions").delete().eq("id", id)
  if (error) {
    console.error("[transactions] delete failed:", error)
    return { success: false, error: "Não foi possível excluir o lançamento." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/lancamentos")
  revalidatePath("/agenda")
  return { success: true }
}
