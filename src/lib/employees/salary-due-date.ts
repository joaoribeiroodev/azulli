import { todayLocalBR } from "@/lib/utils/date"

/** Último dia do mês civil (m = 1–12). */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function clampSalaryDay(year: number, month: number, salaryDay: number): number {
  return Math.min(salaryDay, lastDayOfMonth(year, month))
}

function formatYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/**
 * Próximo vencimento de salário a partir de `fromDate` (YYYY-MM-DD, fuso BR).
 * Se o dia já passou no mês corrente, usa o mês seguinte.
 */
export function nextSalaryDueDateBR(
  salaryDay: number,
  fromDate?: string
): string {
  const today = (fromDate ?? todayLocalBR()).slice(0, 10)
  const [y, m] = today.split("-").map(Number)
  const dayThisMonth = clampSalaryDay(y, m, salaryDay)
  const candidate = formatYMD(y, m, dayThisMonth)
  if (candidate >= today) return candidate

  const nextMonth = m === 12 ? 1 : m + 1
  const nextYear = m === 12 ? y + 1 : y
  const dayNextMonth = clampSalaryDay(nextYear, nextMonth, salaryDay)
  return formatYMD(nextYear, nextMonth, dayNextMonth)
}

/** Intervalo YYYY-MM-DD do mês civil de uma data. */
export function monthRangeFromDate(dateYMD: string): {
  from: string
  to: string
} {
  const [y, m] = dateYMD.slice(0, 10).split("-").map(Number)
  const last = lastDayOfMonth(y, m)
  return {
    from: formatYMD(y, m, 1),
    to: formatYMD(y, m, last),
  }
}
