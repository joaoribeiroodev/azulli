import type { SupabaseClient } from "@supabase/supabase-js"

import {
  buildSalaryDescription,
  DEFAULT_PAYROLL_CATEGORY,
} from "@/lib/employees/payroll-match"
import {
  monthRangeFromDate,
  nextSalaryDueDateBR,
} from "@/lib/employees/salary-due-date"

export type CreateSalaryExpenseResult =
  | { created: true; transactionId: string; dueDate: string }
  | { created: false; dueDate: string; reason: "duplicate" | "skipped" }

export async function createScheduledSalaryExpense(
  supabase: SupabaseClient,
  params: {
    tenantId: string
    employeeId: string
    employeeName: string
    salary: number
    salaryDay: number
  }
): Promise<CreateSalaryExpenseResult> {
  if (params.salary <= 0) {
    return { created: false, dueDate: nextSalaryDueDateBR(params.salaryDay), reason: "skipped" }
  }

  const dueDate = nextSalaryDueDateBR(params.salaryDay)
  const { from, to } = monthRangeFromDate(dueDate)

  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("tenant_id", params.tenantId)
    .eq("employee_id", params.employeeId)
    .eq("type", "expense")
    .gte("due_date", from)
    .lte("due_date", to)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return { created: false, dueDate, reason: "duplicate" }
  }

  const { data: tx, error } = await supabase
    .from("transactions")
    .insert({
      tenant_id: params.tenantId,
      type: "expense",
      amount: params.salary,
      due_date: dueDate,
      description: buildSalaryDescription(params.employeeName),
      category: DEFAULT_PAYROLL_CATEGORY,
      status: "pending",
      employee_id: params.employeeId,
      source: "recurring",
      recurring_group: `payroll:${params.employeeId}`,
    })
    .select("id")
    .single()

  if (error || !tx) {
    console.error("[employees] createScheduledSalaryExpense failed:", error)
    throw new Error("Não foi possível criar a despesa de salário.")
  }

  return { created: true, transactionId: tx.id, dueDate }
}
