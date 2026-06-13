import "server-only"
import { createClient } from "@/lib/supabase/server"
import { getCurrentMonthRange, getLastNDays } from "@/lib/utils/date"

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
    const dueDate = row.due_date // YYYY-MM-DD

    // Apenas pagas no mês corrente entram no saldo realizado
    if (row.status === "paid" && dueDate >= from.slice(0, 10) && dueDate <= to.slice(0, 10)) {
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
  date: string       // "YYYY-MM-DD"
  label: string      // "qua" (abreviado pt-BR)
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
}

export async function getRecentTransactions(limit = 8): Promise<RecentTransaction[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("transactions_with_status")
    .select("id, type, amount, status, due_date, description, customer_id")
    .order("due_date", { ascending: false })
    .limit(limit)

  if (!data) return []

  const customerIds = Array.from(
    new Set(data.map((d) => d.customer_id).filter((x): x is string => !!x))
  )

  let customerMap = new Map<string, string>()
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", customerIds)
    customerMap = new Map((customers ?? []).map((c) => [c.id, c.name]))
  }

  return data.map((d) => ({
    id: d.id,
    type: d.type as "income" | "expense",
    amount: Number(d.amount),
    status: d.status as "pending" | "paid" | "overdue",
    due_date: d.due_date,
    description: d.description,
    customer_name: d.customer_id ? customerMap.get(d.customer_id) ?? null : null,
  }))
}

export async function getCustomersLite(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("customers")
    .select("id, name")
    .order("name", { ascending: true })
    .limit(200)
  return data ?? []
}