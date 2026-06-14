import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { MonthlyBucket } from "@/lib/financial/queries"

/**
 * Série mensal agregada — soma TODAS as receitas/despesas vinculadas a
 * clientes (income) ou fornecedores (expense) por mês.
 *
 * Diferente de getMonthlySeriesByParty que filtra por entidade específica.
 */
export async function getAggregateMonthlySeries(
  scope: "customers" | "suppliers" | "products",
  months: 3 | 6 | 12 = 6
): Promise<MonthlyBucket[]> {
  const supabase = await createClient()

  const buckets = buildMonthBuckets(months)
  const earliest = buckets[0].yearMonth + "-01T00:00:00Z"

  let query = supabase
    .from("transactions")
    .select("amount, paid_at")
    .eq("status", "paid")
    .gte("paid_at", earliest)

  if (scope === "customers") {
    query = query.eq("type", "income").not("customer_id", "is", null)
  } else if (scope === "suppliers") {
    query = query.eq("type", "expense").not("supplier_id", "is", null)
  } else {
    // products: por enquanto retorna vazio (até implementarmos a Sub-fase 3.12)
    return buckets
  }

  const { data } = await query

  const map = new Map(buckets.map((b) => [b.yearMonth, b]))

  for (const row of data ?? []) {
    if (!row.paid_at) continue
    const key = row.paid_at.slice(0, 7) // "YYYY-MM"
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
