"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { toE164BR } from "@/lib/utils/format"
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from "@/lib/employees/schemas"
import { checkPlanLimit } from "@/lib/billing/plan-limits"
import { createScheduledSalaryExpense } from "@/lib/employees/payroll-expense"

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

async function getCurrentTenantId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .limit(1)
    .maybeSingle()
  return data?.tenant_id ?? null
}

function revalidateEmployeeRoutes(id?: string) {
  revalidatePath("/funcionarios")
  revalidatePath("/lancamentos")
  revalidatePath("/dashboard")
  revalidatePath("/agenda")
  if (id) revalidatePath(`/funcionarios/${id}`)
}

export async function createEmployeeAction(
  input: CreateEmployeeInput
): Promise<
  ActionResult<{ id: string; salaryDueDate?: string; salaryExpenseCreated?: boolean }>
> {
  const parsed = createEmployeeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: "Empresa não encontrada." }

  const limit = await checkPlanLimit("employees")
  if (!limit.allowed) return { success: false, error: limit.error }

  const supabase = await createClient()
  const d = parsed.data

  const { data, error } = await supabase
    .from("employees")
    .insert({
      tenant_id: tenantId,
      name: d.name,
      role: d.role || null,
      email: d.email || null,
      phone: d.phone ? toE164BR(d.phone) : null,
      document: d.document || null,
      hire_date: d.hire_date || null,
      salary: d.salary ?? null,
      salary_day: d.salary_day ?? null,
      notes: d.notes || null,
      is_active: d.is_active,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[employees] create failed:", error)
    return {
      success: false,
      error:
        error.code === "23505"
          ? "Já existe um funcionário com esse CPF."
          : "Não foi possível salvar o funcionário.",
    }
  }

  let salaryDueDate: string | undefined
  let salaryExpenseCreated = false

  if (
    d.is_active &&
    d.salary != null &&
    d.salary > 0 &&
    d.salary_day != null
  ) {
    try {
      const expense = await createScheduledSalaryExpense(supabase, {
        tenantId,
        employeeId: data.id,
        employeeName: d.name,
        salary: d.salary,
        salaryDay: d.salary_day,
      })
      salaryDueDate = expense.dueDate
      salaryExpenseCreated = expense.created
    } catch (err) {
      console.error("[employees] salary expense on create failed:", err)
      await supabase.from("employees").delete().eq("id", data.id)
      return {
        success: false,
        error:
          "Não foi possível cadastrar o funcionário e gerar a despesa de salário. Tente novamente.",
      }
    }
  }

  revalidateEmployeeRoutes(data.id)
  return {
    success: true,
    data: {
      id: data.id,
      salaryDueDate,
      salaryExpenseCreated,
    },
  }
}

export async function updateEmployeeAction(
  input: UpdateEmployeeInput
): Promise<ActionResult> {
  const parsed = updateEmployeeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const { id, ...rest } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from("employees")
    .update({
      name: rest.name,
      role: rest.role || null,
      email: rest.email || null,
      phone: rest.phone ? toE164BR(rest.phone) : null,
      document: rest.document || null,
      hire_date: rest.hire_date || null,
      salary: rest.salary ?? null,
      salary_day: rest.salary_day ?? null,
      notes: rest.notes || null,
      is_active: rest.is_active,
    })
    .eq("id", id)

  if (error) {
    console.error("[employees] update failed:", error)
    return {
      success: false,
      error:
        error.code === "23505"
          ? "Já existe um funcionário com esse CPF."
          : "Não foi possível atualizar o funcionário.",
    }
  }

  revalidateEmployeeRoutes(id)
  return { success: true }
}

export async function deleteEmployeeAction(
  id: string
): Promise<ActionResult<{ removedPendingCount: number }>> {
  const supabase = await createClient()

  const { count, error: txErr } = await supabase
    .from("transactions")
    .delete({ count: "exact" })
    .eq("employee_id", id)
    .eq("type", "expense")
    .eq("status", "pending")

  if (txErr) {
    console.error("[employees] delete pending payroll failed:", txErr)
    return {
      success: false,
      error:
        "Não foi possível remover despesas pendentes do funcionário. Tente novamente.",
    }
  }

  const { error } = await supabase.from("employees").delete().eq("id", id)

  if (error) {
    console.error("[employees] delete failed:", error)
    return { success: false, error: "Não foi possível excluir o funcionário." }
  }

  revalidateEmployeeRoutes()
  return {
    success: true,
    data: { removedPendingCount: count ?? 0 },
  }
}
