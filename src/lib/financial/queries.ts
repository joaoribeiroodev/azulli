import "server-only"
import { createClient } from "@/lib/supabase/server"
import { getCurrentMonthRange, getLastNDays } from "@/lib/utils/date"

// ===========================================================================
// Dashboard
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
    .select("type, amount, status, due_date")

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

  let income = 0
  let expense = 0
  let pendingCount = 0
  let pendingAmount = 0
  let overdueCount = 0

  for (const row of data) {
    const amount = Number(row.amount)
    const dueDate = row.due_date

    if (
      row.status === "paid" &&
      dueDate >= from.slice(0, 10) &&
      dueDate <= to.slice(0, 10)
    ) {
      if (row.type === "income") income += amount
      else expense += amount
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

export async function getLast7DaysSeries(): Promise<DailyBucket[]> {
  const supabase = await createClient()
  const days = getLastNDays(7)
  const since = days[0]

  const { data } = await supabase
    .from("transactions_with_status")
    .select("type, amount, due_date, status")
    .gte("due_date", since)
    .eq("status", "paid")

  const map = new Map<string, DailyBucket>()
  const fmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
  for (const d of days) {
    const label = fmt.format(new Date(`${d}T12:00:00`)).replace(".", "")
    map.set(d, { date: d, label, income: 0, expense: 0 })
  }

  for (const row of data ?? []) {
    const bucket = map.get(row.due_date)
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
      "id, type, amount, status, due_date, description, customer_id, supplier_id"
    )
    .order("due_date", { ascending: false })
    .limit(limit)

  if (!data) return []

  const customerIds = Array.from(
    new Set(data.map((d) => d.customer_id).filter((x): x is string => !!x))
  )
  const supplierIds = Array.from(
    new Set(data.map((d) => d.supplier_id).filter((x): x is string => !!x))
  )

  let customerMap = new Map<string, string>()
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", customerIds)
    customerMap = new Map((customers ?? []).map((c) => [c.id, c.name]))
  }

  let supplierMap = new Map<string, string>()
  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, name")
      .in("id", supplierIds)
    supplierMap = new Map((suppliers ?? []).map((s) => [s.id, s.name]))
  }

  return data.map((d) => ({
    id: d.id,
    type: d.type as "income" | "expense",
    amount: Number(d.amount),
    status: d.status as "pending" | "paid" | "overdue",
    due_date: d.due_date,
    description: d.description,
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

// ===========================================================================
// Listagem paginada de lançamentos
// ===========================================================================

export type TransactionFilters = {
  type?: "income" | "expense" | "all"
  status?: "pending" | "paid" | "overdue" | "all"
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
  has_invoice: boolean
}

export type PaginatedTransactions = {
  rows: PaginatedTransactionRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

async function buildInvoiceMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  txIds: string[]
): Promise<Set<string>> {
  if (txIds.length === 0) return new Set()
  const { data: invs } = await supabase
    .from("invoices")
    .select("transaction_id")
    .in("transaction_id", txIds)
    .in("status", ["processing", "authorized"])
  return new Set((invs ?? []).map((i) => i.transaction_id))
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
      "id, type, amount, status, raw_status, due_date, paid_at, description, customer_id, supplier_id",
      { count: "exact" }
    )

  if (filters.type && filters.type !== "all") {
    query = query.eq("type", filters.type)
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
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
  const customerIds = Array.from(
    new Set(rowsRaw.map((r) => r.customer_id).filter((x): x is string => !!x))
  )
  const supplierIds = Array.from(
    new Set(rowsRaw.map((r) => r.supplier_id).filter((x): x is string => !!x))
  )

  let customerMap = new Map<string, string>()
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", customerIds)
    customerMap = new Map((customers ?? []).map((c) => [c.id, c.name]))
  }

  let supplierMap = new Map<string, string>()
  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, name")
      .in("id", supplierIds)
    supplierMap = new Map((suppliers ?? []).map((s) => [s.id, s.name]))
  }

  const txIds = rowsRaw.map((r) => r.id)
  const invoiceMap = await buildInvoiceMap(supabase, txIds)

  const rows: PaginatedTransactionRow[] = rowsRaw.map((r) => ({
    id: r.id,
    type: r.type as "income" | "expense",
    amount: Number(r.amount),
    status: r.status as "pending" | "paid" | "overdue",
    raw_status: r.raw_status as "pending" | "paid",
    due_date: r.due_date,
    paid_at: r.paid_at,
    description: r.description,
    customer_id: r.customer_id,
    customer_name: r.customer_id
      ? customerMap.get(r.customer_id) ?? null
      : null,
    supplier_id: r.supplier_id,
    supplier_name: r.supplier_id
      ? supplierMap.get(r.supplier_id) ?? null
      : null,
    has_invoice: invoiceMap.has(r.id),
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

// Helper compartilhado entre customer e supplier
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
      "id, type, amount, status, raw_status, due_date, paid_at, description, customer_id, supplier_id",
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
  const txIds = rowsRaw.map((r) => r.id)
  const invoiceMap = await buildInvoiceMap(supabase, txIds)

  const rows: PaginatedTransactionRow[] = rowsRaw.map((r) => ({
    id: r.id,
    type: r.type as "income" | "expense",
    amount: Number(r.amount),
    status: r.status as "pending" | "paid" | "overdue",
    raw_status: r.raw_status as "pending" | "paid",
    due_date: r.due_date,
    paid_at: r.paid_at,
    description: r.description,
    customer_id: r.customer_id,
    customer_name: null,
    supplier_id: r.supplier_id,
    supplier_name: null,
    has_invoice: invoiceMap.has(r.id),
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
// Listas (clientes / fornecedores) com totais
// ===========================================================================

export type CustomerRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  document: string | null
  created_at: string
}

export async function listCustomers(): Promise<CustomerRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, phone, document, created_at")
    .order("name", { ascending: true })

  if (error) {
    console.error("[queries] listCustomers failed:", error)
    return []
  }
  return data ?? []
}

export type CustomerRowWithTotals = CustomerRow & {
  total_received: number
}

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

export type SupplierRowWithTotals = SupplierRow & {
  total_paid: number
}

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
