import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  getCurrentMonthRange,
  todayLocalBR,
  utcToLocalDateBR,
} from "@/lib/utils/date"

export type AccountantPeriodSummary = {
  income: number
  expense: number
  profit: number
  paidIncome: number
  paidExpense: number
  paidProfit: number
  pendingAmount: number
  pendingCount: number
  overdueCount: number
  overdueReceivable: number
  overduePayable: number
  transactionCount: number
  ofxImportCount: number
}

export type AccountantCompanyProfile = {
  name: string
  document: string | null
  email: string | null
  phone: string | null
  cidade: string | null
  uf: string | null
  taxRegime: string | null
  businessType: string | null
}

export type AccountantCategoryRow = {
  category: string
  label: string
  total: number
  share: number
}

export type AccountantPendingItem = {
  id: string
  type: "income" | "expense"
  amount: number
  description: string | null
  due_date: string
  status: "pending" | "overdue"
}

export type AccountantMonthlyBucket = {
  month: string
  label: string
  income: number
  expense: number
  profit: number
}

export function resolveAccountantRange(month?: string): {
  from: string
  to: string
  label: string
} {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  })

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    const label = fmt
      .format(new Date(y, m - 1, 1))
      .replace(/^\w/, (c) => c.toUpperCase())
    return {
      from: `${month}-01`,
      to: `${month}-${String(lastDay).padStart(2, "0")}`,
      label,
    }
  }

  const { from, to } = getCurrentMonthRange()
  const today = todayLocalBR()
  const [y, m] = today.split("-").map(Number)
  const label = fmt
    .format(new Date(y, m - 1, 1))
    .replace(/^\w/, (c) => c.toUpperCase())
  return { from: from.slice(0, 10), to: to.slice(0, 10), label }
}

function previousRange(from: string): { from: string; to: string } {
  const [y, m] = from.split("-").map(Number)
  const prevMonth = m === 1 ? 12 : m - 1
  const prevYear = m === 1 ? y - 1 : y
  const lastDay = new Date(prevYear, prevMonth, 0).getDate()
  const mm = String(prevMonth).padStart(2, "0")
  return {
    from: `${prevYear}-${mm}-01`,
    to: `${prevYear}-${mm}-${String(lastDay).padStart(2, "0")}`,
  }
}

function isInPaidPeriod(
  paidAt: string | null,
  dueDate: string,
  from: string,
  to: string
): boolean {
  const ref = paidAt ? utcToLocalDateBR(paidAt) : dueDate
  return ref >= from && ref <= to
}

export async function getAccountantCompanyProfile(): Promise<AccountantCompanyProfile | null> {
  const supabase = await createClient()
  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "name, document, email, phone, cidade, uf"
    )
    .limit(1)
    .maybeSingle()

  if (!tenant) return null

  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("default_tax_regime, business_type")
    .limit(1)
    .maybeSingle()

  const taxLabels: Record<string, string> = {
    mei: "MEI",
    simples_nacional: "Simples Nacional",
  }

  return {
    name: tenant.name as string,
    document: (tenant.document as string | null) ?? null,
    email: (tenant.email as string | null) ?? null,
    phone: (tenant.phone as string | null) ?? null,
    cidade: (tenant.cidade as string | null) ?? null,
    uf: (tenant.uf as string | null) ?? null,
    taxRegime: settings?.default_tax_regime
      ? taxLabels[settings.default_tax_regime as string] ??
        String(settings.default_tax_regime)
      : null,
    businessType: (settings?.business_type as string | null) ?? null,
  }
}

export async function getAccountantPeriodSummary(
  from: string,
  to: string
): Promise<AccountantPeriodSummary> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transactions_with_status")
    .select(
      "type, amount, status, due_date, paid_at, source"
    )

  if (error || !data) {
    console.error("[accountant] period summary failed:", error)
    return emptyPeriodSummary()
  }

  let income = 0
  let expense = 0
  let paidIncome = 0
  let paidExpense = 0
  let pendingAmount = 0
  let pendingCount = 0
  let overdueCount = 0
  let overdueReceivable = 0
  let overduePayable = 0
  let transactionCount = 0
  let ofxImportCount = 0

  for (const row of data) {
    const amount = Number(row.amount)
    const type = row.type as "income" | "expense"
    const status = row.status as string
    const source = row.source as string | null

    if (status === "paid") {
      if (isInPaidPeriod(row.paid_at as string | null, row.due_date as string, from, to)) {
        transactionCount += 1
        if (source === "ofx_import") ofxImportCount += 1
        if (type === "income") {
          income += amount
          paidIncome += amount
        } else {
          expense += amount
          paidExpense += amount
        }
      }
    }

    if (status === "pending" || status === "overdue") {
      pendingCount += 1
      pendingAmount += amount
      if (status === "overdue") {
        overdueCount += 1
        if (type === "income") overdueReceivable += amount
        else overduePayable += amount
      }
    }
  }

  return {
    income,
    expense,
    profit: income - expense,
    paidIncome,
    paidExpense,
    paidProfit: paidIncome - paidExpense,
    pendingAmount,
    pendingCount,
    overdueCount,
    overdueReceivable,
    overduePayable,
    transactionCount,
    ofxImportCount,
  }
}

function emptyPeriodSummary(): AccountantPeriodSummary {
  return {
    income: 0,
    expense: 0,
    profit: 0,
    paidIncome: 0,
    paidExpense: 0,
    paidProfit: 0,
    pendingAmount: 0,
    pendingCount: 0,
    overdueCount: 0,
    overdueReceivable: 0,
    overduePayable: 0,
    transactionCount: 0,
    ofxImportCount: 0,
  }
}

export async function getAccountantPeriodComparison(month?: string) {
  const currentRange = resolveAccountantRange(month)
  const prevRange = previousRange(currentRange.from)
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  })
  const [py, pm] = prevRange.from.split("-").map(Number)
  const previousLabel = fmt.format(new Date(py, pm - 1, 1))

  const [current, previous] = await Promise.all([
    getAccountantPeriodSummary(currentRange.from, currentRange.to),
    getAccountantPeriodSummary(prevRange.from, prevRange.to),
  ])

  const deltaProfit = current.profit - previous.profit
  const deltaIncome =
    previous.income > 0
      ? ((current.income - previous.income) / previous.income) * 100
      : null
  const deltaExpense =
    previous.expense > 0
      ? ((current.expense - previous.expense) / previous.expense) * 100
      : null

  return {
    current,
    previous,
    currentLabel: currentRange.label,
    previousLabel,
    deltaProfit,
    deltaIncome,
    deltaExpense,
  }
}

export async function getAccountantCategoryBreakdown(
  from: string,
  to: string
): Promise<AccountantCategoryRow[]> {
  const supabase = await createClient()
  const fromTs = `${from}T00:00:00-03:00`
  const toTs = `${to}T23:59:59-03:00`

  const { data, error } = await supabase
    .from("transactions")
    .select("category, amount, paid_at")
    .eq("type", "expense")
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .gte("paid_at", fromTs)
    .lte("paid_at", toTs)

  if (error || !data) return []

  const map = new Map<string, number>()
  for (const row of data) {
    const key =
      row.category && String(row.category).trim()
        ? String(row.category)
        : "Sem categoria"
    map.set(key, (map.get(key) ?? 0) + Number(row.amount))
  }

  const total = [...map.values()].reduce((a, b) => a + b, 0)
  return [...map.entries()]
    .map(([category, totalAmount]) => ({
      category,
      label: category,
      total: totalAmount,
      share: total > 0 ? (totalAmount / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
}

export async function getAccountantPendingItems(): Promise<{
  overdueReceivables: AccountantPendingItem[]
  overduePayables: AccountantPendingItem[]
  upcomingPayables: AccountantPendingItem[]
}> {
  const supabase = await createClient()
  const today = todayLocalBR()
  const in7 = addDaysIso(today, 7)

  const { data } = await supabase
    .from("transactions_with_status")
    .select("id, type, amount, description, due_date, status")
    .in("status", ["pending", "overdue"])
    .order("due_date", { ascending: true })
    .limit(200)

  const overdueReceivables: AccountantPendingItem[] = []
  const overduePayables: AccountantPendingItem[] = []
  const upcomingPayables: AccountantPendingItem[] = []

  for (const row of data ?? []) {
    const item: AccountantPendingItem = {
      id: row.id as string,
      type: row.type as "income" | "expense",
      amount: Number(row.amount),
      description: row.description as string | null,
      due_date: row.due_date as string,
      status: row.status as "pending" | "overdue",
    }

    if (item.status === "overdue") {
      if (item.type === "income") overdueReceivables.push(item)
      else overduePayables.push(item)
    } else if (
      item.type === "expense" &&
      item.due_date >= today &&
      item.due_date <= in7
    ) {
      upcomingPayables.push(item)
    }
  }

  return {
    overdueReceivables: overdueReceivables.slice(0, 8),
    overduePayables: overduePayables.slice(0, 8),
    upcomingPayables: upcomingPayables.slice(0, 8),
  }
}

export async function getAccountantMonthlyTrend(
  months = 6
): Promise<AccountantMonthlyBucket[]> {
  const supabase = await createClient()
  const today = todayLocalBR()
  const [y, m] = today.split("-").map(Number)

  const fmt = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" })
  const buckets: AccountantMonthlyBucket[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = fmt.format(d).replace(".", "")
    buckets.push({ month, label, income: 0, expense: 0, profit: 0 })
  }

  const earliest = buckets[0]?.month
  if (!earliest) return buckets

  const { data } = await supabase
    .from("transactions")
    .select("type, amount, paid_at")
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .gte("paid_at", `${earliest}-01T00:00:00-03:00`)

  const index = new Map(buckets.map((b, i) => [b.month, i]))

  for (const row of data ?? []) {
    if (!row.paid_at) continue
    const local = utcToLocalDateBR(row.paid_at as string)
    const month = local.slice(0, 7)
    const idx = index.get(month)
    if (idx === undefined) continue
    const amount = Number(row.amount)
    if (row.type === "income") buckets[idx].income += amount
    else buckets[idx].expense += amount
  }

  for (const b of buckets) {
    b.profit = b.income - b.expense
  }

  return buckets
}

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
