import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { PaginatedTransactions, PaginatedTransactionRow } from "@/lib/financial/queries"
import { matchesEmployeePayroll } from "./payroll-match"
import type { EmployeeRow } from "./queries"

type PayrollTxRow = {
  id: string
  type: string
  amount: number
  status: string
  raw_status: string
  due_date: string
  paid_at: string | null
  description: string | null
  category: string | null
}

async function fetchPayrollCandidates(
  employeeName: string
): Promise<PayrollTxRow[]> {
  const supabase = await createClient()
  const tokens = employeeName
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
  const searchToken = tokens[0] ?? employeeName.slice(0, 20)

  const { data, error } = await supabase
    .from("transactions_with_status")
    .select(
      "id, type, amount, status, raw_status, due_date, paid_at, description, category"
    )
    .eq("type", "expense")
    .or(
      `description.ilike.%${searchToken}%,category.ilike.%folha%,category.ilike.%salario%,category.ilike.%salário%`
    )
    .order("due_date", { ascending: false })
    .limit(500)

  if (error || !data) {
    console.error("[employees] fetchPayrollCandidates failed:", error)
    return []
  }

  return data
    .filter((row) =>
      matchesEmployeePayroll(
        {
          description: row.description as string | null,
          category: row.category as string | null,
        },
        employeeName
      )
    )
    .map((r) => ({
      id: r.id as string,
      type: r.type as string,
      amount: Number(r.amount),
      status: r.status as string,
      raw_status: r.raw_status as string,
      due_date: r.due_date as string,
      paid_at: r.paid_at as string | null,
      description: r.description as string | null,
      category: r.category as string | null,
    }))
}

function toPaginatedRow(r: PayrollTxRow): PaginatedTransactionRow {
  return {
    id: r.id,
    type: "expense",
    amount: r.amount,
    status: r.status as PaginatedTransactionRow["status"],
    raw_status: r.raw_status as "pending" | "paid",
    due_date: r.due_date,
    paid_at: r.paid_at,
    description: r.description,
    category: r.category,
    customer_id: null,
    customer_name: null,
    supplier_id: null,
    supplier_name: null,
  }
}

export type EmployeePayrollKpis = {
  totalPaid: number
  paidThisMonth: number
  pendingAmount: number
  overdueAmount: number
  paymentCount: number
  lastPaymentDate: string | null
  salaryDeltaThisMonth: number | null
}

export type EmployeeDetail = EmployeeRow & {
  tenureDays: number | null
  tenureLabel: string | null
  kpis: EmployeePayrollKpis
}

export type MonthlyPayrollBucket = {
  yearMonth: string
  label: string
  total: number
}

function getCurrentMonthRange(): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const from = `${y}-${String(m + 1).padStart(2, "0")}-01`
  const lastDay = new Date(y, m + 1, 0).getDate()
  const to = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return { from, to }
}

function computeTenure(hireDate: string | null): {
  tenureDays: number | null
  tenureLabel: string | null
} {
  if (!hireDate) return { tenureDays: null, tenureLabel: null }
  const [y, m, d] = hireDate.split("-").map(Number)
  const start = new Date(y, m - 1, d)
  const days = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return { tenureDays: 0, tenureLabel: "Admissão futura" }

  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  let label: string
  if (years >= 1) {
    label = `${years} ano${years > 1 ? "s" : ""}${months > 0 ? ` e ${months} mês${months > 1 ? "es" : ""}` : ""}`
  } else if (months >= 1) {
    label = `${months} mês${months > 1 ? "es" : ""}`
  } else {
    label = `${days} dia${days !== 1 ? "s" : ""}`
  }
  return { tenureDays: days, tenureLabel: label }
}

function computePayrollKpis(
  rows: PayrollTxRow[],
  salary: number | null
): EmployeePayrollKpis {
  const { from, to } = getCurrentMonthRange()
  let totalPaid = 0
  let paidThisMonth = 0
  let pendingAmount = 0
  let overdueAmount = 0
  let lastPaymentDate: string | null = null

  for (const t of rows) {
    const amount = t.amount
    if (t.status === "paid") {
      totalPaid += amount
      const ref = t.paid_at?.slice(0, 10) ?? t.due_date
      if (ref >= from && ref <= to) paidThisMonth += amount
      if (!lastPaymentDate || ref > lastPaymentDate) lastPaymentDate = ref
    } else if (t.status === "pending") {
      pendingAmount += amount
    } else if (t.status === "overdue") {
      pendingAmount += amount
      overdueAmount += amount
    }
  }

  const salaryDeltaThisMonth =
    salary !== null && salary > 0 ? paidThisMonth - salary : null

  return {
    totalPaid,
    paidThisMonth,
    pendingAmount,
    overdueAmount,
    paymentCount: rows.length,
    lastPaymentDate,
    salaryDeltaThisMonth,
  }
}

export async function getEmployeeDetail(
  id: string
): Promise<EmployeeDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, name, role, email, phone, document, hire_date, salary, notes, is_active, created_at"
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null

  const employee: EmployeeRow = {
    ...data,
    salary: data.salary !== null ? Number(data.salary) : null,
  }

  const payrollRows = await fetchPayrollCandidates(employee.name)
  const { tenureDays, tenureLabel } = computeTenure(employee.hire_date)

  return {
    ...employee,
    tenureDays,
    tenureLabel,
    kpis: computePayrollKpis(payrollRows, employee.salary),
  }
}

export async function listPayrollTransactionsByEmployee(
  employeeName: string,
  page = 1,
  pageSize = 15
): Promise<PaginatedTransactions> {
  const all = await fetchPayrollCandidates(employeeName)
  const total = all.length
  const fromIdx = (page - 1) * pageSize
  const slice = all.slice(fromIdx, fromIdx + pageSize)

  return {
    rows: slice.map(toPaginatedRow),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function getEmployeePayrollSeries(
  employeeName: string,
  months = 6
): Promise<MonthlyPayrollBucket[]> {
  const buckets = buildMonthBuckets(months)
  const rows = await fetchPayrollCandidates(employeeName)

  const map = new Map(buckets.map((b) => [b.yearMonth, b]))
  for (const row of rows) {
    if (row.status !== "paid" || !row.paid_at) continue
    const key = row.paid_at.slice(0, 7)
    const bucket = map.get(key)
    if (bucket) bucket.total += row.amount
  }

  return Array.from(map.values())
}

function buildMonthBuckets(months: number): MonthlyPayrollBucket[] {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
  const buckets: MonthlyPayrollBucket[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = fmt.format(d).replace(".", "").replace(" de ", "/")
    buckets.push({ yearMonth, label, total: 0 })
  }
  return buckets
}
