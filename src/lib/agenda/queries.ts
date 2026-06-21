import "server-only"

import { createClient } from "@/lib/supabase/server"
import { addDaysYMD, todayLocalBR } from "@/lib/utils/date"
import type { ReminderPriority } from "@/lib/reminders/schemas"
import type { CalendarEvent } from "@/lib/agenda/types"

type TxRow = {
  id: string
  type: string
  amount: number
  status: string
  due_date: string
  description: string | null
  category: string | null
  customer_id: string | null
  supplier_id: string | null
  source?: string | null
}

async function hydratePartyNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: TxRow[]
) {
  const customerIds = [
    ...new Set(rows.map((r) => r.customer_id).filter(Boolean)),
  ] as string[]
  const supplierIds = [
    ...new Set(rows.map((r) => r.supplier_id).filter(Boolean)),
  ] as string[]

  const customerMap = new Map<string, string>()
  const supplierMap = new Map<string, string>()

  if (customerIds.length > 0) {
    const { data } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", customerIds)
    for (const c of data ?? []) customerMap.set(c.id, c.name)
  }

  if (supplierIds.length > 0) {
    const { data } = await supabase
      .from("suppliers")
      .select("id, name")
      .in("id", supplierIds)
    for (const s of data ?? []) supplierMap.set(s.id, s.name)
  }

  return { customerMap, supplierMap }
}

function transactionTitle(row: TxRow): string {
  if (row.description?.trim()) return row.description.trim()
  if (row.category) return row.category
  return row.type === "income" ? "Receita pendente" : "Despesa pendente"
}

function mapTransactionEvents(
  rows: TxRow[],
  customerMap: Map<string, string>,
  supplierMap: Map<string, string>
): CalendarEvent[] {
  return rows.map((r) => {
    const status = r.status as "pending" | "overdue"
    const type = r.type as "income" | "expense"
    const kind =
      status === "overdue"
        ? "overdue"
        : type === "income"
          ? "income"
          : "expense"

    const customerName = r.customer_id
      ? customerMap.get(r.customer_id) ?? null
      : null
    const supplierName = r.supplier_id
      ? supplierMap.get(r.supplier_id) ?? null
      : null

    return {
      id: `tx-${r.id}`,
      source: "transaction",
      date: r.due_date.slice(0, 10),
      title: transactionTitle(r),
      subtitle:
        type === "income"
          ? customerName ?? undefined
          : supplierName ?? undefined,
      amount: Number(r.amount),
      kind,
      href: "/lancamentos",
      transaction: {
        id: r.id,
        type,
        amount: Number(r.amount),
        status,
        due_date: r.due_date,
        description: r.description,
        category: r.category,
        customer_name: customerName,
        supplier_name: supplierName,
        source: r.source ?? null,
      },
    }
  })
}

export async function getCalendarEvents(opts: {
  from: string
  to: string
}): Promise<CalendarEvent[]> {
  const supabase = await createClient()
  const from = opts.from.slice(0, 10)
  const to = opts.to.slice(0, 10)

  const [txResult, remindersResult, goalsResult] = await Promise.all([
    supabase
      .from("transactions_with_status")
      .select(
        "id, type, amount, status, due_date, description, category, customer_id, supplier_id, source"
      )
      .in("status", ["pending", "overdue"])
      .gte("due_date", from)
      .lte("due_date", to)
      .order("due_date", { ascending: true }),
    supabase
      .from("reminders")
      .select("id, title, due_date, is_done, priority")
      .eq("is_done", false)
      .gte("due_date", from)
      .lte("due_date", to)
      .order("due_date", { ascending: true }),
    supabase
      .from("goals")
      .select("id, title, period_end")
      .eq("is_archived", false)
      .gte("period_end", from)
      .lte("period_end", to)
      .order("period_end", { ascending: true }),
  ])

  const txRows = (txResult.data ?? []) as TxRow[]
  const { customerMap, supplierMap } = await hydratePartyNames(
    supabase,
    txRows
  )

  const events: CalendarEvent[] = [
    ...mapTransactionEvents(txRows, customerMap, supplierMap),
    ...(remindersResult.data ?? []).map((r) => ({
      id: `rem-${r.id}`,
      source: "reminder" as const,
      date: r.due_date.slice(0, 10),
      title: r.title,
      kind: "reminder" as const,
      href: "/metas-e-lembretes?tab=lembretes",
      priority: r.priority as ReminderPriority,
      isDone: r.is_done,
      reminderId: r.id,
    })),
    ...(goalsResult.data ?? []).map((g) => ({
      id: `goal-${g.id}`,
      source: "goal" as const,
      date: g.period_end.slice(0, 10),
      title: g.title,
      subtitle: "Prazo da meta",
      kind: "goal_deadline" as const,
      href: "/metas-e-lembretes?tab=metas",
      goalId: g.id,
    })),
  ]

  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.title.localeCompare(b.title, "pt-BR")
  })

  return events
}

/** Próximos N dias a partir de hoje (inclusive). */
export async function getUpcomingCalendarEvents(
  days = 7
): Promise<CalendarEvent[]> {
  const today = todayLocalBR()
  const to = addDaysYMD(today, days - 1)
  return getCalendarEvents({ from: today, to })
}
