import "server-only"
import { createClient } from "@/lib/supabase/server"

export type EmployeeRow = {
  id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  document: string | null
  hire_date: string | null
  salary: number | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export type EmployeeStats = {
  totalActive: number
  totalInactive: number
  monthlyPayroll: number  // soma dos salários dos ativos
}

export async function listEmployees(): Promise<EmployeeRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, name, role, email, phone, document, hire_date, salary, notes, is_active, created_at"
    )
    .order("is_active", { ascending: false })
    .order("name", { ascending: true })

  if (error || !data) return []
  return data.map((e) => ({
    ...e,
    salary: e.salary !== null ? Number(e.salary) : null,
  }))
}

export async function getEmployeeStats(): Promise<EmployeeStats> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("employees")
    .select("salary, is_active")

  let active = 0
  let inactive = 0
  let payroll = 0
  for (const e of data ?? []) {
    if (e.is_active) {
      active += 1
      if (e.salary !== null) payroll += Number(e.salary)
    } else {
      inactive += 1
    }
  }
  return { totalActive: active, totalInactive: inactive, monthlyPayroll: payroll }
}

export async function getEmployeeDetails(
  id: string
): Promise<EmployeeRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, name, role, email, phone, document, hire_date, salary, notes, is_active, created_at"
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null
  return {
    ...data,
    salary: data.salary !== null ? Number(data.salary) : null,
  }
}
