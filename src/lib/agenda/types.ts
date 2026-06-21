import type { ReminderPriority } from "@/lib/reminders/schemas"

export type CalendarEventKind =
  | "income"
  | "expense"
  | "overdue"
  | "reminder"
  | "goal_deadline"

export type CalendarEventSource = "transaction" | "reminder" | "goal"

export type AgendaFilter = "all" | "transactions" | "reminders" | "goals"

export type CalendarTransactionPayload = {
  id: string
  type: "income" | "expense"
  amount: number
  status: "pending" | "paid" | "overdue"
  due_date: string
  description: string | null
  category: string | null
  customer_name?: string | null
  supplier_name?: string | null
  source?: string | null
}

export type CalendarEvent = {
  id: string
  source: CalendarEventSource
  date: string
  title: string
  subtitle?: string
  amount?: number
  kind: CalendarEventKind
  href: string
  priority?: ReminderPriority
  isDone?: boolean
  reminderId?: string
  goalId?: string
  transaction?: CalendarTransactionPayload
}
