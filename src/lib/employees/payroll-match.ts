/**
 * Associa despesas de folha/salário a um funcionário por descrição e categoria.
 * Não exige employee_id em transactions — útil até vinculação formal no schema.
 */

const PAYROLL_CATEGORY_HINTS = [
  "folha",
  "salario",
  "salário",
  "salarios",
  "salários",
  "prolabore",
  "pro-labore",
  "pro labore",
  "remuneracao",
  "remuneração",
]

const PAYROLL_DESCRIPTION_HINTS = [
  "salario",
  "salário",
  "folha",
  "prolabore",
  "pro-labore",
  "pagamento",
  "remessa",
]

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function hasPayrollHint(text: string): boolean {
  return PAYROLL_DESCRIPTION_HINTS.some((h) => text.includes(h))
}

function hasPayrollCategory(cat: string): boolean {
  return PAYROLL_CATEGORY_HINTS.some((h) => cat.includes(h))
}

export function matchesEmployeePayroll(
  tx: { description: string | null; category: string | null },
  employeeName: string
): boolean {
  const desc = normalize(tx.description ?? "")
  const cat = normalize(tx.category ?? "")
  const fullName = normalize(employeeName)
  const firstName = fullName.split(/\s+/).find((t) => t.length >= 3) ?? fullName

  if (fullName.length >= 3 && desc.includes(fullName)) {
    return hasPayrollHint(desc) || hasPayrollCategory(cat) || desc.includes(fullName)
  }

  if (firstName.length >= 3 && desc.includes(firstName)) {
    return hasPayrollHint(desc) || hasPayrollCategory(cat)
  }

  if (hasPayrollCategory(cat) && firstName.length >= 3 && desc.includes(firstName)) {
    return true
  }

  return false
}

export function buildSalaryDescription(employeeName: string): string {
  return `Salário — ${employeeName}`
}

export const DEFAULT_PAYROLL_CATEGORY = "Folha de pagamento"
