import "server-only"
import { createClient } from "@/lib/supabase/server"
import {
  getCurrentMonthRange,
  getLastNDays,
  getWeekdayLabel,
  utcToLocalDateBR,
} from "@/lib/utils/date"

// ===========================================================================
// Dashboard summary
// ===========================================================================

export type DashboardSummary = {
  income: number
  expense: number
  profit: number
  pendingCount: number
  pendingAmount: number
  overdueCount: number
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createClient()
  const { from, to } = getCurrentMonthRange()

  const { data, error } = await supabase
    .from("transactions_with_status")
    .select("type, amount, status, due_date, paid_at")

  if (error || !data) {
    console.error("[queries] getDashboardSummary failed:", error)
    return {
      income: 0,
      expense: 0,
      profit: 0,
      pendingCount: 0,
      pendingAmount: 0,
      overdueCount: 0,
    }
  }

  const fromDate = from.slice(0, 10)
  const toDate = to.slice(0, 10)

  let income = 0
  let expense = 0
  let pendingCount = 0
  let pendingAmount = 0
  let overdueCount = 0

  for (const row of data) {
    const amount = Number(row.amount)

    if (row.status === "paid") {
      // Usa paid_at se houver (data real do pagamento, BR), senão due_date
      const refDate = row.paid_at
        ? utcToLocalDateBR(row.paid_at)
        : row.due_date
      if (refDate >= fromDate && refDate <= toDate) {
        if (row.type === "income") income += amount
        else expense += amount
      }
    }

    if (row.status === "pending" || row.status === "overdue") {
      pendingCount += 1
      pendingAmount += amount
      if (row.status === "overdue") overdueCount += 1
    }
  }

  return {
    income,
    expense,
    profit: income - expense,
    pendingCount,
    pendingAmount,
    overdueCount,
  }
}

export type DailyBucket = {
  date: string
  label: string
  income: number
  expense: number
}

/**
 * Série dos últimos 7 dias agrupada por DATA DO PAGAMENTO (paid_at).
 * Agrupamento usa timezone BR pra evitar bug de "vendas à noite caem no dia seguinte".
 */
export async function getLast7DaysSeries(): Promise<DailyBucket[]> {
  const supabase = await createClient()
  const days = getLastNDays(7)
  const since = days[0]

  // Filtra com margem de 1 dia pros 2 lados pra capturar tudo na faixa BR
  const sinceUtc = `${since}T00:00:00-03:00`

  const { data } = await supabase
    .from("transactions_with_status")
    .select("type, amount, paid_at, status")
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .gte("paid_at", sinceUtc)

  // Monta buckets dos 7 dias com label de dia da semana em PT-BR
  const map = new Map<string, DailyBucket>()
  for (const d of days) {
    map.set(d, {
      date: d,
      label: getWeekdayLabel(d),
      income: 0,
      expense: 0,
    })
  }

  for (const row of data ?? []) {
    if (!row.paid_at) continue
    const localDate = utcToLocalDateBR(row.paid_at)
    const bucket = map.get(localDate)
    if (!bucket) continue
    const amount = Number(row.amount)
    if (row.type === "income") bucket.income += amount
    else bucket.expense += amount
  }

  return Array.from(map.values())
}

export type RecentTransaction = {
  id: string
  type: "income" | "expense"
  amount: number
  status: "pending" | "paid" | "overdue"
  due_date: string
  description: string | null
  category: string | null
  customer_name: string | null
  supplier_name: string | null
}

export async function getRecentTransactions(
  limit = 8
): Promise<RecentTransaction[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("transactions_with_status")
    .select(
      "id, type, amount, status, due_date, description, category, customer_id, supplier_id"
    )
    .order("due_date", { ascending: false })
    .limit(limit)

  if (!data) return []

  const { customerMap, supplierMap } = await hydrateParties(supabase, data)

  return data.map((d) => ({
    id: d.id,
    type: d.type as "income" | "expense",
    amount: Number(d.amount),
    status: d.status as "pending" | "paid" | "overdue",
    due_date: d.due_date,
    description: d.description,
    category: d.category,
    customer_name: d.customer_id
      ? customerMap.get(d.customer_id) ?? null
      : null,
    supplier_name: d.supplier_id
      ? supplierMap.get(d.supplier_id) ?? null
      : null,
  }))
}

export async function getCustomersLite(): Promise<
  { id: string; name: string }[]
> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("customers")
    .select("id, name")
    .order("name", { ascending: true })
    .limit(200)
  return data ?? []
}

export async function getSuppliersLite(): Promise<
  { id: string; name: string }[]
> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("suppliers")
    .select("id, name")
    .order("name", { ascending: true })
    .limit(200)
  return data ?? []
}

export async function getCategoriesUsed(
  type?: "income" | "expense"
): Promise<{ category: string; count: number }[]> {
  const supabase = await createClient()
  let query = supabase
    .from("transactions")
    .select("category, type")
    .not("category", "is", null)

  if (type) query = query.eq("type", type)

  const { data } = await query.limit(500)

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    if (!row.category) continue
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
}

// ===========================================================================
// Top 1 / Top 5
// ===========================================================================

export type TopParty = {
  id: string
  name: string
  total: number
}

export async function getTopCustomerOfMonth(): Promise<TopParty | null> {
  const supabase = await createClient()
  const { from, to } = getCurrentMonthRange()
  const { data } = await supabase
    .from("transactions")
    .select("amount, customer_id")
    .eq("type", "income")
    .eq("status", "paid")
    .not("customer_id", "is", null)
    .gte("paid_at", from)
    .lte("paid_at", to)
  return aggregateTopOne(data ?? [], "customer_id", supabase, "customers")
}

export async function getTopSupplierOfMonth(): Promise<TopParty | null> {
  const supabase = await createClient()
  const { from, to } = getCurrentMonthRange()
  const { data } = await supabase
    .from("transactions")
    .select("amount, supplier_id")
    .eq("type", "expense")
    .eq("status", "paid")
    .not("supplier_id", "is", null)
    .gte("paid_at", from)
    .lte("paid_at", to)
  return aggregateTopOne(data ?? [], "supplier_id", supabase, "suppliers")
}

async function aggregateTopOne(
  rows: Array<{ amount: number | string; [key: string]: unknown }>,
  field: "customer_id" | "supplier_id",
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "customers" | "suppliers"
): Promise<TopParty | null> {
  if (rows.length === 0) return null

  const totals = new Map<string, number>()
  for (const r of rows) {
    const id = r[field] as string | null
    if (!id) continue
    totals.set(id, (totals.get(id) ?? 0) + Number(r.amount))
  }

  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return null

  const [topId, topTotal] = sorted[0]
  const { data: party } = await supabase
    .from(table)
    .select("id, name")
    .eq("id", topId)
    .maybeSingle()

  if (!party) return null
  return { id: party.id, name: party.name, total: topTotal }
}

export type TopPartyRange = "month" | "last30d"

export async function getTopCustomers(
  range: TopPartyRange = "month"
): Promise<TopParty[]> {
  const supabase = await createClient()
  const { from, to } = computeRange(range)
  const { data } = await supabase
    .from("transactions")
    .select("amount, customer_id")
    .eq("type", "income")
    .eq("status", "paid")
    .not("customer_id", "is", null)
    .gte("paid_at", from)
    .lte("paid_at", to)
  return aggregateTopN(data ?? [], "customer_id", supabase, "customers", 5)
}

export async function getTopSuppliers(
  range: TopPartyRange = "month"
): Promise<TopParty[]> {
  const supabase = await createClient()
  const { from, to } = computeRange(range)
  const { data } = await supabase
    .from("transactions")
    .select("amount, supplier_id")
    .eq("type", "expense")
    .eq("status", "paid")
    .not("supplier_id", "is", null)
    .gte("paid_at", from)
    .lte("paid_at", to)
  return aggregateTopN(data ?? [], "supplier_id", supabase, "suppliers", 5)
}

async function aggregateTopN(
  rows: Array<{ amount: number | string; [key: string]: unknown }>,
  field: "customer_id" | "supplier_id",
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "customers" | "suppliers",
  n: number
): Promise<TopParty[]> {
  if (rows.length === 0) return []

  const totals = new Map<string, number>()
  for (const r of rows) {
    const id = r[field] as string | null
    if (!id) continue
    totals.set(id, (totals.get(id) ?? 0) + Number(r.amount))
  }

  const topIds = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)

  if (topIds.length === 0) return []

  const ids = topIds.map(([id]) => id)
  const { data: parties } = await supabase
    .from(table)
    .select("id, name")
    .in("id", ids)

  const nameMap = new Map((parties ?? []).map((p) => [p.id, p.name]))

  return topIds
    .map(([id, total]) => ({
      id,
      name: nameMap.get(id) ?? "—",
      total,
    }))
    .filter((p) => p.name !== "—")
}

function computeRange(range: TopPartyRange): { from: string; to: string } {
  if (range === "month") {
    return getCurrentMonthRange()
  }
  const today = new Date()
  const last30 = new Date(today)
  last30.setDate(last30.getDate() - 30)
  return {
    from: last30.toISOString().slice(0, 10) + "T00:00:00-03:00",
    to: today.toISOString().slice(0, 10) + "T23:59:59-03:00",
  }
}

// ===========================================================================
// Série mensal por entidade (cliente/fornecedor)
// ===========================================================================

export type MonthlyBucket = {
  yearMonth: string
  label: string
  total: number
}

export async function getMonthlySeriesByParty(
  partyId: string,
  partyType: "customer" | "supplier",
  months: 3 | 6 | 12 = 6
): Promise<MonthlyBucket[]> {
  const supabase = await createClient()

  const buckets = buildMonthBuckets(months)
  const earliest = buckets[0].yearMonth + "-01T00:00:00-03:00"

  const column = partyType === "customer" ? "customer_id" : "supplier_id"
  const txType = partyType === "customer" ? "income" : "expense"

  const { data } = await supabase
    .from("transactions")
    .select("amount, paid_at")
    .eq(column, partyId)
    .eq("type", txType)
    .eq("status", "paid")
    .gte("paid_at", earliest)

  const map = new Map(buckets.map((b) => [b.yearMonth, b]))

  for (const row of data ?? []) {
    if (!row.paid_at) continue
    const localDate = utcToLocalDateBR(row.paid_at)
    const key = localDate.slice(0, 7)
    const bucket = map.get(key)
    if (bucket) bucket.total += Number(row.amount)
  }

  return Array.from(map.values())
}

function buildMonthBuckets(months: number): MonthlyBucket[] {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "America/Sao_Paulo",
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

// ===========================================================================
// Listagem paginada de lançamentos
// ===========================================================================

export type TransactionFilters = {
  type?: "income" | "expense" | "all"
  status?: "pending" | "paid" | "overdue" | "all"
  category?: string | "all"
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export type PaginatedTransactionRow = RecentTransaction & {
  paid_at: string | null
  raw_status: "pending" | "paid"
  customer_id: string | null
  supplier_id: string | null
}

export type PaginatedTransactions = {
  rows: PaginatedTransactionRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

async function hydrateParties(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: Array<{ customer_id?: string | null; supplier_id?: string | null }>
): Promise<{
  customerMap: Map<string, string>
  supplierMap: Map<string, string>
}> {
  const customerIds = Array.from(
    new Set(rows.map((r) => r.customer_id).filter((x): x is string => !!x))
  )
  const supplierIds = Array.from(
    new Set(rows.map((r) => r.supplier_id).filter((x): x is string => !!x))
  )

  const customerMap = new Map<string, string>()
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", customerIds)
    for (const c of customers ?? []) customerMap.set(c.id, c.name)
  }

  const supplierMap = new Map<string, string>()
  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, name")
      .in("id", supplierIds)
    for (const s of suppliers ?? []) supplierMap.set(s.id, s.name)
  }

  return { customerMap, supplierMap }
}

export async function listTransactions(
  filters: TransactionFilters = {}
): Promise<PaginatedTransactions> {
  const supabase = await createClient()
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 20))
  const fromIdx = (page - 1) * pageSize
  const toIdx = fromIdx + pageSize - 1

  let query = supabase
    .from("transactions_with_status")
    .select(
      "id, type, amount, status, raw_status, due_date, paid_at, description, category, customer_id, supplier_id",
      { count: "exact" }
    )

  if (filters.type && filters.type !== "all") query = query.eq("type", filters.type)
  if (filters.status && filters.status !== "all")
    query = query.eq("status", filters.status)
  if (filters.category && filters.category !== "all") {
    if (filters.category === "__uncategorized") {
      query = query.is("category", null)
    } else {
      query = query.eq("category", filters.category)
    }
  }
  if (filters.from) query = query.gte("due_date", filters.from)
  if (filters.to) query = query.lte("due_date", filters.to)

  const { data, error, count } = await query
    .order("due_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx)

  if (error) {
    console.error("[queries] listTransactions failed:", error)
    return { rows: [], total: 0, page, pageSize, totalPages: 0 }
  }

  const rowsRaw = data ?? []
  const { customerMap, supplierMap } = await hydrateParties(supabase, rowsRaw)

  const rows: PaginatedTransactionRow[] = rowsRaw.map((r) => ({
    id: r.id,
    type: r.type as "income" | "expense",
    amount: Number(r.amount),
    status: r.status as "pending" | "paid" | "overdue",
    raw_status: r.raw_status as "pending" | "paid",
    due_date: r.due_date,
    paid_at: r.paid_at,
    description: r.description,
    category: r.category,
    customer_id: r.customer_id,
    customer_name: r.customer_id
      ? customerMap.get(r.customer_id) ?? null
      : null,
    supplier_id: r.supplier_id,
    supplier_name: r.supplier_id
      ? supplierMap.get(r.supplier_id) ?? null
      : null,
  }))

  const total = count ?? 0
  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

// ===========================================================================
// Cliente — detalhes
// ===========================================================================

export type CustomerDetail = {
  id: string
  name: string
  email: string | null
  phone: string | null
  document: string | null
  created_at: string
  kpis: {
    totalReceived: number
    pendingAmount: number
    overdueAmount: number
    averageTicket: number
    transactionCount: number
  }
}

export async function getCustomerDetails(
  id: string
): Promise<CustomerDetail | null> {
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, name, email, phone, document, created_at")
    .eq("id", id)
    .maybeSingle()
  if (error || !customer) return null

  const { data: txs } = await supabase
    .from("transactions_with_status")
    .select("type, amount, status")
    .eq("customer_id", id)
    .eq("type", "income")

  let totalReceived = 0
  let pendingAmount = 0
  let overdueAmount = 0
  let paidCount = 0

  for (const t of txs ?? []) {
    const amount = Number(t.amount)
    if (t.status === "paid") {
      totalReceived += amount
      paidCount += 1
    } else if (t.status === "pending") {
      pendingAmount += amount
    } else if (t.status === "overdue") {
      pendingAmount += amount
      overdueAmount += amount
    }
  }

  return {
    ...customer,
    kpis: {
      totalReceived,
      pendingAmount,
      overdueAmount,
      averageTicket: paidCount > 0 ? totalReceived / paidCount : 0,
      transactionCount: txs?.length ?? 0,
    },
  }
}

export async function listTransactionsByCustomer(
  customerId: string,
  page = 1,
  pageSize = 15
): Promise<PaginatedTransactions> {
  return listTransactionsByParty("customer_id", customerId, page, pageSize)
}

// ===========================================================================
// Fornecedor — detalhes
// ===========================================================================

export type SupplierDetail = {
  id: string
  name: string
  email: string | null
  phone: string | null
  document: string | null
  notes: string | null
  created_at: string
  kpis: {
    totalPaid: number
    pendingAmount: number
    overdueAmount: number
    averageTicket: number
    transactionCount: number
  }
}

export async function getSupplierDetails(
  id: string
): Promise<SupplierDetail | null> {
  const supabase = await createClient()

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .select("id, name, email, phone, document, notes, created_at")
    .eq("id", id)
    .maybeSingle()
  if (error || !supplier) return null

  const { data: txs } = await supabase
    .from("transactions_with_status")
    .select("type, amount, status")
    .eq("supplier_id", id)
    .eq("type", "expense")

  let totalPaid = 0
  let pendingAmount = 0
  let overdueAmount = 0
  let paidCount = 0

  for (const t of txs ?? []) {
    const amount = Number(t.amount)
    if (t.status === "paid") {
      totalPaid += amount
      paidCount += 1
    } else if (t.status === "pending") {
      pendingAmount += amount
    } else if (t.status === "overdue") {
      pendingAmount += amount
      overdueAmount += amount
    }
  }

  return {
    ...supplier,
    kpis: {
      totalPaid,
      pendingAmount,
      overdueAmount,
      averageTicket: paidCount > 0 ? totalPaid / paidCount : 0,
      transactionCount: txs?.length ?? 0,
    },
  }
}

export async function listTransactionsBySupplier(
  supplierId: string,
  page = 1,
  pageSize = 15
): Promise<PaginatedTransactions> {
  return listTransactionsByParty("supplier_id", supplierId, page, pageSize)
}

async function listTransactionsByParty(
  column: "customer_id" | "supplier_id",
  partyId: string,
  page = 1,
  pageSize = 15
): Promise<PaginatedTransactions> {
  const supabase = await createClient()
  const p = Math.max(1, page)
  const ps = Math.min(100, Math.max(5, pageSize))
  const fromIdx = (p - 1) * ps
  const toIdx = fromIdx + ps - 1

  const { data, error, count } = await supabase
    .from("transactions_with_status")
    .select(
      "id, type, amount, status, raw_status, due_date, paid_at, description, category, customer_id, supplier_id",
      { count: "exact" }
    )
    .eq(column, partyId)
    .order("due_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx)

  if (error) {
    console.error("[queries] listTransactionsByParty failed:", error)
    return { rows: [], total: 0, page: p, pageSize: ps, totalPages: 0 }
  }

  const rowsRaw = data ?? []

  const rows: PaginatedTransactionRow[] = rowsRaw.map((r) => ({
    id: r.id,
    type: r.type as "income" | "expense",
    amount: Number(r.amount),
    status: r.status as "pending" | "paid" | "overdue",
    raw_status: r.raw_status as "pending" | "paid",
    due_date: r.due_date,
    paid_at: r.paid_at,
    description: r.description,
    category: r.category,
    customer_id: r.customer_id,
    customer_name: null,
    supplier_id: r.supplier_id,
    supplier_name: null,
  }))

  const total = count ?? 0
  return {
    rows,
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.max(1, Math.ceil(total / ps)),
  }
}

// ===========================================================================
// Listas com totais
// ===========================================================================

export type CustomerRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  document: string | null
  created_at: string
}

export type CustomerRowWithTotals = CustomerRow & { total_received: number }

export async function listCustomersWithTotals(): Promise<
  CustomerRowWithTotals[]
> {
  const supabase = await createClient()
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, email, phone, document, created_at")
    .order("name", { ascending: true })

  if (error || !customers || customers.length === 0) return []

  const ids = customers.map((c) => c.id)
  const { data: txs } = await supabase
    .from("transactions_with_status")
    .select("customer_id, amount, type, status")
    .in("customer_id", ids)
    .eq("type", "income")
    .eq("status", "paid")

  const totalsMap = new Map<string, number>()
  for (const t of txs ?? []) {
    if (!t.customer_id) continue
    totalsMap.set(
      t.customer_id,
      (totalsMap.get(t.customer_id) ?? 0) + Number(t.amount)
    )
  }

  return customers.map((c) => ({
    ...c,
    total_received: totalsMap.get(c.id) ?? 0,
  }))
}

export type SupplierRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  document: string | null
  notes: string | null
  created_at: string
}

export type SupplierRowWithTotals = SupplierRow & { total_paid: number }

export async function listSuppliersWithTotals(): Promise<
  SupplierRowWithTotals[]
> {
  const supabase = await createClient()
  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select("id, name, email, phone, document, notes, created_at")
    .order("name", { ascending: true })

  if (error || !suppliers || suppliers.length === 0) return []

  const ids = suppliers.map((s) => s.id)
  const { data: txs } = await supabase
    .from("transactions_with_status")
    .select("supplier_id, amount, type, status")
    .in("supplier_id", ids)
    .eq("type", "expense")
    .eq("status", "paid")

  const totalsMap = new Map<string, number>()
  for (const t of txs ?? []) {
    if (!t.supplier_id) continue
    totalsMap.set(
      t.supplier_id,
      (totalsMap.get(t.supplier_id) ?? 0) + Number(t.amount)
    )
  }

  return suppliers.map((s) => ({
    ...s,
    total_paid: totalsMap.get(s.id) ?? 0,
  }))
}
