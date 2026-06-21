import "server-only"
import { createClient } from "@/lib/supabase/server"
import {
  buildMonthBucketsBR,
  startOfDayBRTIso,
  utcToLocalDateBR,
} from "@/lib/utils/date"
import type { MonthlyBucket } from "@/lib/financial/queries"

/**
 * Série mensal agregada — soma TODAS as receitas/despesas/vendas no período.
 *
 *  - customers: income paid vinculado a clientes
 *  - suppliers: expense paid vinculado a fornecedores
 *  - products:  income paid vinculado a produtos (via product_id OU items)
 */
export async function getAggregateMonthlySeries(
  scope: "customers" | "suppliers" | "products",
  months: 3 | 6 | 12 = 6
): Promise<MonthlyBucket[]> {
  const supabase = await createClient()

  const buckets = buildMonthBuckets(months)
  const earliest = startOfDayBRTIso(buckets[0].yearMonth + "-01")

  if (scope === "customers") {
    const { data } = await supabase
      .from("transactions")
      .select("amount, paid_at")
      .eq("type", "income")
      .eq("status", "paid")
      .not("customer_id", "is", null)
      .gte("paid_at", earliest)
    return fillBuckets(buckets, data ?? [], "amount", "paid_at")
  }

  if (scope === "suppliers") {
    const { data } = await supabase
      .from("transactions")
      .select("amount, paid_at")
      .eq("type", "expense")
      .eq("status", "paid")
      .not("supplier_id", "is", null)
      .gte("paid_at", earliest)
    return fillBuckets(buckets, data ?? [], "amount", "paid_at")
  }

  const [txRes, itemsRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, paid_at")
      .eq("type", "income")
      .eq("status", "paid")
      .not("product_id", "is", null)
      .gte("paid_at", earliest),
    supabase
      .from("transaction_items")
      .select("total, transactions!inner(type, status, paid_at)")
      .eq("transactions.type", "income")
      .eq("transactions.status", "paid")
      .gte("transactions.paid_at", earliest),
  ])

  const map = new Map(buckets.map((b) => [b.yearMonth, b]))

  for (const row of txRes.data ?? []) {
    if (!row.paid_at) continue
    const key = utcToLocalDateBR(row.paid_at).slice(0, 7)
    const bucket = map.get(key)
    if (bucket) bucket.total += Number(row.amount)
  }

  for (const row of itemsRes.data ?? []) {
    const paidAt = (row as unknown as { transactions: { paid_at: string } })
      .transactions?.paid_at
    if (!paidAt) continue
    const key = utcToLocalDateBR(paidAt).slice(0, 7)
    const bucket = map.get(key)
    if (bucket) bucket.total += Number(row.total)
  }

  return Array.from(map.values())
}

function fillBuckets(
  buckets: MonthlyBucket[],
  data: Array<Record<string, unknown>>,
  amountField: string,
  dateField: string
): MonthlyBucket[] {
  const map = new Map(buckets.map((b) => [b.yearMonth, b]))
  for (const row of data) {
    const paidAt = row[dateField] as string | null
    if (!paidAt) continue
    const key = utcToLocalDateBR(paidAt).slice(0, 7)
    const bucket = map.get(key)
    if (bucket) bucket.total += Number(row[amountField])
  }
  return Array.from(map.values())
}

function buildMonthBuckets(months: number): MonthlyBucket[] {
  return buildMonthBucketsBR(months).map((b) => ({
    ...b,
    total: 0,
  }))
}
