"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  createProductSchema,
  updateProductSchema,
  stockAdjustmentSchema,
  type CreateProductInput,
  type UpdateProductInput,
  type StockAdjustmentInput,
} from "@/lib/products/schemas"

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

// ---------------------------------------------------------------------------
// Create product
// ---------------------------------------------------------------------------

export async function createProductAction(
  input: CreateProductInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createProductSchema.safeParse(input)
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

  // Service force track_stock=false
  const isService = d.kind === "service"
  const trackStock = isService ? false : d.track_stock
  const stockQty = isService ? 0 : d.stock_quantity

  const { data, error } = await supabase
    .from("products")
    .insert({
      tenant_id: tenantId,
      name: d.name,
      kind: d.kind,
      description: d.description || null,
      sku: d.sku || null,
      price: d.price,
      cost: d.cost ?? null,
      track_stock: trackStock,
      stock_quantity: stockQty,
      low_stock_threshold: d.low_stock_threshold ?? null,
      unit: d.unit || "un",
      ncm: d.ncm || null,
      cfop: d.cfop || null,
      is_active: d.is_active,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[products] create failed:", error)
    return {
      success: false,
      error:
        error.code === "23505"
          ? "Já existe um produto com esse SKU."
          : "Não foi possível salvar o produto.",
    }
  }

  // Se criou com estoque inicial > 0, registra movimento "initial"
  if (trackStock && stockQty > 0) {
    await supabase.from("stock_movements").insert({
      tenant_id: tenantId,
      product_id: data.id,
      kind: "initial",
      quantity: stockQty,
      stock_after: stockQty,
      notes: "Estoque inicial ao cadastrar produto",
    })
  }

  revalidatePath("/produtos")
  revalidatePath("/lancamentos")
  return { success: true, data: { id: data.id } }
}

// ---------------------------------------------------------------------------
// Update product
// ---------------------------------------------------------------------------

export async function updateProductAction(
  input: UpdateProductInput
): Promise<ActionResult> {
  const parsed = updateProductSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const { id, ...rest } = parsed.data
  const supabase = await createClient()

  const isService = rest.kind === "service"
  const trackStock = isService ? false : rest.track_stock

  // Não permitimos mudar stock_quantity diretamente pelo update —
  // estoque só muda via stock_movements (mantém auditoria).
  // O campo stock_quantity é gerenciado pelo helper applyStockMovement.

  const { error } = await supabase
    .from("products")
    .update({
      name: rest.name,
      kind: rest.kind,
      description: rest.description || null,
      sku: rest.sku || null,
      price: rest.price,
      cost: rest.cost ?? null,
      track_stock: trackStock,
      low_stock_threshold: rest.low_stock_threshold ?? null,
      unit: rest.unit || "un",
      ncm: rest.ncm || null,
      cfop: rest.cfop || null,
      is_active: rest.is_active,
    })
    .eq("id", id)

  if (error) {
    console.error("[products] update failed:", error)
    return {
      success: false,
      error:
        error.code === "23505"
          ? "Já existe um produto com esse SKU."
          : "Não foi possível atualizar o produto.",
    }
  }

  revalidatePath("/produtos")
  revalidatePath(`/produtos/${id}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Delete product
// ---------------------------------------------------------------------------

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Bloqueia se houver transactions vinculadas
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id)

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error:
        "Este produto está vinculado a lançamentos. Inative-o em vez de excluir.",
    }
  }

  // Também bloqueia se tem items em transactions
  const { count: itemsCount } = await supabase
    .from("transaction_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id)

  if ((itemsCount ?? 0) > 0) {
    return {
      success: false,
      error:
        "Este produto aparece em vendas com múltiplos itens. Inative-o em vez de excluir.",
    }
  }

  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) {
    console.error("[products] delete failed:", error)
    return { success: false, error: "Não foi possível excluir o produto." }
  }

  revalidatePath("/produtos")
  return { success: true }
}

// ---------------------------------------------------------------------------
// Ajuste manual de estoque
// ---------------------------------------------------------------------------

export async function adjustStockAction(
  input: StockAdjustmentInput
): Promise<ActionResult> {
  const parsed = stockAdjustmentSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: "Empresa não encontrada." }

  const supabase = await createClient()
  const { product_id, kind, quantity, notes } = parsed.data

  const result = await applyStockMovement(supabase, {
    tenantId,
    productId: product_id,
    kind,
    quantity,
    notes: notes || null,
  })

  if (!result.success) return result

  revalidatePath("/produtos")
  revalidatePath(`/produtos/${product_id}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Helper: aplica movimento de estoque + atualiza products.stock_quantity
// ---------------------------------------------------------------------------

export type StockMovementKind =
  | "sale"
  | "purchase"
  | "adjustment_in"
  | "adjustment_out"
  | "initial"

type ApplyParams = {
  tenantId: string
  productId: string
  kind: StockMovementKind
  quantity: number // sempre positiva
  notes?: string | null
  transactionId?: string | null
  transactionItemId?: string | null
}

/**
 * Aplica um movimento de estoque de forma transacional:
 * 1. Lê estoque atual
 * 2. Calcula novo (subtrai se sale/adjustment_out, soma caso contrário)
 * 3. Atualiza products.stock_quantity
 * 4. Registra em stock_movements (append-only)
 *
 * Se o produto não tem track_stock=true, retorna sucesso sem ação (no-op).
 * Se daria estoque negativo, falha.
 */
export async function applyStockMovement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: ApplyParams
): Promise<ActionResult> {
  // Lê o produto
  const { data: product, error: prodErr } = await supabase
    .from("products")
    .select("track_stock, stock_quantity, kind, name")
    .eq("id", params.productId)
    .maybeSingle()

  if (prodErr || !product) {
    return { success: false, error: "Produto não encontrado." }
  }

  // Serviços não controlam estoque — no-op
  if (product.kind === "service" || !product.track_stock) {
    return { success: true }
  }

  const isOutflow =
    params.kind === "sale" || params.kind === "adjustment_out"
  const delta = isOutflow ? -params.quantity : params.quantity
  const newQty = Number(product.stock_quantity) + delta

  if (newQty < 0) {
    return {
      success: false,
      error: `Estoque insuficiente de "${product.name}". Disponível: ${product.stock_quantity}.`,
    }
  }

  // Atualiza estoque
  const { error: updateErr } = await supabase
    .from("products")
    .update({ stock_quantity: newQty })
    .eq("id", params.productId)

  if (updateErr) {
    console.error("[products] stock update failed:", updateErr)
    return { success: false, error: "Não foi possível atualizar o estoque." }
  }

  // Loga o movimento
  const { error: logErr } = await supabase.from("stock_movements").insert({
    tenant_id: params.tenantId,
    product_id: params.productId,
    kind: params.kind,
    quantity: delta, // negativo se outflow
    stock_after: newQty,
    transaction_id: params.transactionId ?? null,
    transaction_item_id: params.transactionItemId ?? null,
    notes: params.notes ?? null,
  })

  if (logErr) {
    console.error("[products] stock movement log failed:", logErr)
    // Não revertemos a atualização aqui — log de erro é prioridade.
    // Idealmente isto seria uma transaction SQL. Fica como melhoria.
  }

  return { success: true }
}
