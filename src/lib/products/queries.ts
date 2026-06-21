import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentMonthRange, getLast30DaysRangeBR } from "@/lib/utils/date"
import type { MonthlyBucket } from "@/lib/financial/queries"

// ===========================================================================
// Tipos
// ===========================================================================

export type ProductRow = {
  id: string
  name: string
  kind: "product" | "service"
  description: string | null
  sku: string | null
  price: number
  cost: number | null
  track_stock: boolean
  stock_quantity: number
  low_stock_threshold: number | null
  unit: string
  ncm: string | null
  cfop: string | null
  is_active: boolean
  created_at: string
}

export type ProductRowWithStats = ProductRow & {
  total_sold: number // valor total vendido (income paid)
  units_sold: number // unidades vendidas
  is_low_stock: boolean
}

export type ProductDetail = ProductRow & {
  kpis: {
    totalSold: number
    unitsSold: number
    totalCostValue: number // se cost preenchido: cost * unitsSold
    estimatedMargin: number // total_sold - totalCostValue
    avgSalePrice: number
  }
}

export type StockMovement = {
  id: string
  kind:
    | "sale"
    | "purchase"
    | "adjustment_in"
    | "adjustment_out"
    | "initial"
  quantity: number
  stock_after: number
  notes: string | null
  created_at: string
  transaction_id: string | null
}

// ===========================================================================
// Listagem
// ===========================================================================

export async function listProductsWithStats(): Promise<ProductRowWithStats[]> {
  const supabase = await createClient()

  const { data: products, error } = await supabase
    .from("products")
    .select(
      "id, name, kind, description, sku, price, cost, track_stock, stock_quantity, low_stock_threshold, unit, ncm, cfop, is_active, created_at"
    )
    .order("is_active", { ascending: false })
    .order("name", { ascending: true })

  if (error || !products || products.length === 0) return []

  const ids = products.map((p) => p.id)

  // Soma items vendidos por produto (income paid)
  const [{ data: itemsAgg }, { data: txAgg }] = await Promise.all([
    supabase
      .from("transaction_items")
      .select("product_id, quantity, total, transactions!inner(type, status)")
      .in("product_id", ids)
      .eq("transactions.type", "income")
      .eq("transactions.status", "paid"),
    // Também conta product_id direto na transactions (single-product mode)
    supabase
      .from("transactions")
      .select("product_id, amount")
      .in("product_id", ids)
      .eq("type", "income")
      .eq("status", "paid"),
  ])

  const soldMap = new Map<string, { total: number; units: number }>()

  for (const row of itemsAgg ?? []) {
    if (!row.product_id) continue
    const cur = soldMap.get(row.product_id) ?? { total: 0, units: 0 }
    cur.total += Number(row.total)
    cur.units += Number(row.quantity)
    soldMap.set(row.product_id, cur)
  }

  for (const row of txAgg ?? []) {
    if (!row.product_id) continue
    const cur = soldMap.get(row.product_id) ?? { total: 0, units: 0 }
    cur.total += Number(row.amount)
    cur.units += 1
    soldMap.set(row.product_id, cur)
  }

  return products.map((p) => {
    const stats = soldMap.get(p.id) ?? { total: 0, units: 0 }
    const lowStock =
      p.track_stock &&
      p.low_stock_threshold !== null &&
      Number(p.stock_quantity) <= Number(p.low_stock_threshold)

    return {
      id: p.id,
      name: p.name,
      kind: p.kind as "product" | "service",
      description: p.description,
      sku: p.sku,
      price: Number(p.price),
      cost: p.cost !== null ? Number(p.cost) : null,
      track_stock: p.track_stock,
      stock_quantity: Number(p.stock_quantity),
      low_stock_threshold:
        p.low_stock_threshold !== null ? Number(p.low_stock_threshold) : null,
      unit: p.unit,
      ncm: p.ncm,
      cfop: p.cfop,
      is_active: p.is_active,
      created_at: p.created_at,
      total_sold: stats.total,
      units_sold: stats.units,
      is_low_stock: lowStock,
    }
  })
}

// ===========================================================================
// Lite (combobox / dialog selects)
// ===========================================================================

export type ProductLite = {
  id: string
  name: string
  kind: "product" | "service"
  price: number
  stock_quantity: number
  track_stock: boolean
  unit: string
}

export const getProductsLite = cache(async (): Promise<ProductLite[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("products")
    .select("id, name, kind, price, stock_quantity, track_stock, unit")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(500)

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind as "product" | "service",
    price: Number(p.price),
    stock_quantity: Number(p.stock_quantity),
    track_stock: p.track_stock,
    unit: p.unit,
  }))
})

// ===========================================================================
// Detalhes
// ===========================================================================

export async function getProductDetails(
  id: string
): Promise<ProductDetail | null> {
  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from("products")
    .select(
      "id, name, kind, description, sku, price, cost, track_stock, stock_quantity, low_stock_threshold, unit, ncm, cfop, is_active, created_at"
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !product) return null

  const [itemsRes, txRes] = await Promise.all([
    supabase
      .from("transaction_items")
      .select("quantity, total, transactions!inner(type, status)")
      .eq("product_id", id)
      .eq("transactions.type", "income")
      .eq("transactions.status", "paid"),
    supabase
      .from("transactions")
      .select("amount")
      .eq("product_id", id)
      .eq("type", "income")
      .eq("status", "paid"),
  ])

  let totalSold = 0
  let unitsSold = 0
  for (const row of itemsRes.data ?? []) {
    totalSold += Number(row.total)
    unitsSold += Number(row.quantity)
  }
  for (const row of txRes.data ?? []) {
    totalSold += Number(row.amount)
    unitsSold += 1
  }

  const cost = product.cost !== null ? Number(product.cost) : null
  const totalCostValue = cost !== null ? cost * unitsSold : 0
  const estimatedMargin = totalSold - totalCostValue
  const avgSalePrice = unitsSold > 0 ? totalSold / unitsSold : 0

  return {
    id: product.id,
    name: product.name,
    kind: product.kind as "product" | "service",
    description: product.description,
    sku: product.sku,
    price: Number(product.price),
    cost,
    track_stock: product.track_stock,
    stock_quantity: Number(product.stock_quantity),
    low_stock_threshold:
      product.low_stock_threshold !== null
        ? Number(product.low_stock_threshold)
        : null,
    unit: product.unit,
    ncm: product.ncm,
    cfop: product.cfop,
    is_active: product.is_active,
    created_at: product.created_at,
    kpis: {
      totalSold,
      unitsSold,
      totalCostValue,
      estimatedMargin,
      avgSalePrice,
    },
  }
}

// ===========================================================================
// Histórico de movimentações de estoque
// ===========================================================================

export async function listStockMovements(
  productId: string,
  limit = 30
): Promise<StockMovement[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("stock_movements")
    .select(
      "id, kind, quantity, stock_after, notes, created_at, transaction_id"
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit)

  return (data ?? []).map((m) => ({
    id: m.id,
    kind: m.kind as StockMovement["kind"],
    quantity: Number(m.quantity),
    stock_after: Number(m.stock_after),
    notes: m.notes,
    created_at: m.created_at,
    transaction_id: m.transaction_id,
  }))
}

// ===========================================================================
// Top 5 produtos do período
// ===========================================================================

export type TopProduct = {
  id: string
  name: string
  total: number
  units: number
}

export async function getTopProducts(
  range: "month" | "last30d" = "month",
  limit = 5
): Promise<TopProduct[]> {
  const supabase = await createClient()
  const { from, to } =
    range === "month"
      ? getCurrentMonthRange()
      : getLast30DaysRangeBR()

  // Busca items vendidos no período
  const [{ data: itemsAgg }, { data: txAgg }] = await Promise.all([
    supabase
      .from("transaction_items")
      .select(
        "product_id, quantity, total, transactions!inner(type, status, paid_at)"
      )
      .eq("transactions.type", "income")
      .eq("transactions.status", "paid")
      .gte("transactions.paid_at", from)
      .lte("transactions.paid_at", to),
    supabase
      .from("transactions")
      .select("product_id, amount")
      .eq("type", "income")
      .eq("status", "paid")
      .not("product_id", "is", null)
      .gte("paid_at", from)
      .lte("paid_at", to),
  ])

  const totals = new Map<string, { total: number; units: number }>()

  for (const row of itemsAgg ?? []) {
    if (!row.product_id) continue
    const cur = totals.get(row.product_id) ?? { total: 0, units: 0 }
    cur.total += Number(row.total)
    cur.units += Number(row.quantity)
    totals.set(row.product_id, cur)
  }

  for (const row of txAgg ?? []) {
    if (!row.product_id) continue
    const cur = totals.get(row.product_id) ?? { total: 0, units: 0 }
    cur.total += Number(row.amount)
    cur.units += 1
    totals.set(row.product_id, cur)
  }

  const sortedIds = Array.from(totals.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit)
    .map(([id]) => id)

  if (sortedIds.length === 0) return []

  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .in("id", sortedIds)

  const nameMap = new Map((products ?? []).map((p) => [p.id, p.name]))

  return sortedIds
    .map((id) => {
      const stats = totals.get(id)!
      return {
        id,
        name: nameMap.get(id) ?? "—",
        total: stats.total,
        units: stats.units,
      }
    })
    .filter((p) => p.name !== "—")
}

// ===========================================================================
// Série mensal de vendas por produto
// ===========================================================================

export async function getMonthlySeriesByProduct(
  productId: string,
  months: 3 | 6 | 12 = 6
): Promise<MonthlyBucket[]> {
  const supabase = await createClient()

  const buckets = buildMonthBuckets(months)
  const earliest = buckets[0].yearMonth + "-01T00:00:00Z"

  // Combina items + product_id direto
  const [itemsRes, txRes] = await Promise.all([
    supabase
      .from("transaction_items")
      .select(
        "total, transactions!inner(type, status, paid_at)"
      )
      .eq("product_id", productId)
      .eq("transactions.type", "income")
      .eq("transactions.status", "paid")
      .gte("transactions.paid_at", earliest),
    supabase
      .from("transactions")
      .select("amount, paid_at")
      .eq("product_id", productId)
      .eq("type", "income")
      .eq("status", "paid")
      .gte("paid_at", earliest),
  ])

  const map = new Map(buckets.map((b) => [b.yearMonth, b]))

  for (const row of itemsRes.data ?? []) {
    const paidAt = (row as unknown as { transactions: { paid_at: string } })
      .transactions?.paid_at
    if (!paidAt) continue
    const key = paidAt.slice(0, 7)
    const bucket = map.get(key)
    if (bucket) bucket.total += Number(row.total)
  }

  for (const row of txRes.data ?? []) {
    if (!row.paid_at) continue
    const key = row.paid_at.slice(0, 7)
    const bucket = map.get(key)
    if (bucket) bucket.total += Number(row.amount)
  }

  return Array.from(map.values())
}

function buildMonthBuckets(months: number): MonthlyBucket[] {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  })
  const buckets: MonthlyBucket[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = fmt.format(d).replace(".", "").replace(" de ", "/")
    buckets.push({ yearMonth, label, total: 0 })
  }
  return buckets
}
