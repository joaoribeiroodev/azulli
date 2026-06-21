/**
 * Utilitários de data com timezone fixo em America/Sao_Paulo.
 *
 * IMPORTANTE: o Azulli é Brasil-only. Pra evitar bugs sutis de fuso horário
 * (vendas feitas às 22h aparecendo "no dia seguinte" pq o servidor é UTC),
 * todas as operações que produzem "datas locais" usam timezone BR explícito.
 *
 * Dados sensíveis ao timezone:
 *   - "Que dia é hoje?" (pra montar gráficos semanais)
 *   - "Qual o mês atual?" (pra dashboard summary)
 *   - "Que dia da semana é isso?" (pra labels)
 *
 * Dados que SÃO timestamps UTC e ficam como estão:
 *   - paid_at (timestamptz)
 *   - created_at (timestamptz)
 *   - due_date (date — sem timezone, é só uma data nominal)
 */

const BR_TIMEZONE = "America/Sao_Paulo"
const BR_OFFSET = "-03:00"

export { BR_TIMEZONE }

/**
 * Converte um instante (`Date` ou ISO) para YYYY-MM-DD no fuso BR.
 */
export function formatDateInBR(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/**
 * Alias semântico — preferir em código de negócio.
 */
export function todayLocalBR(): string {
  return formatDateInBR(new Date())
}

/** 0 = domingo … 6 = sábado (calendário BR). */
export function getWeekdayIndexBR(dateStr: string): number {
  return new Date(`${dateStr.slice(0, 10)}T12:00:00${BR_OFFSET}`).getUTCDay()
}

/**
 * Últimos N dias como array de strings YYYY-MM-DD (mais antigo primeiro,
 * mais recente por último).
 *
 * getLastNDays(7) em 14/06/2026 (sábado) →
 *   ["2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12", "2026-06-13", "2026-06-14"]
 */
export function getLastNDays(n: number): string[] {
  const today = todayLocalBR()
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    days.push(addDaysYMD(today, i - (n - 1)))
  }
  return days
}

/**
 * Range do mês atual em ISO com offset BR (-03:00).
 * Usado pra queries que filtram paid_at no mês corrente.
 */
export function getCurrentMonthRange(): { from: string; to: string } {
  const today = todayLocalBR()
  const [y, m] = today.split("-").map(Number)
  const lastDay = new Date(y, m, 0).getDate() // dia 0 do próximo mês = último do atual

  const monthStr = String(m).padStart(2, "0")
  const lastDayStr = String(lastDay).padStart(2, "0")

  return {
    from: `${y}-${monthStr}-01T00:00:00${BR_OFFSET}`,
    to: `${y}-${monthStr}-${lastDayStr}T23:59:59${BR_OFFSET}`,
  }
}

/** Últimos 30 dias civis no fuso BR (inclusive hoje). */
export function getLast30DaysRangeBR(): { from: string; to: string } {
  const to = todayLocalBR()
  const from = addDaysYMD(to, -30)
  return {
    from: `${from}T00:00:00${BR_OFFSET}`,
    to: `${to}T23:59:59${BR_OFFSET}`,
  }
}

/** Início/fim do dia civil BR como timestamptz ISO. */
export function startOfDayBRTIso(dateYMD: string): string {
  return `${dateYMD.slice(0, 10)}T00:00:00${BR_OFFSET}`
}

export function endOfDayBRTIso(dateYMD: string): string {
  return `${dateYMD.slice(0, 10)}T23:59:59${BR_OFFSET}`
}

export function startOfTodayBRTIso(): string {
  return startOfDayBRTIso(todayLocalBR())
}

export function endOfTodayBRTIso(): string {
  return endOfDayBRTIso(todayLocalBR())
}

export type MonthBucketLabel = { yearMonth: string; label: string }

/** Buckets mensais alinhados ao calendário BR (últimos N meses). */
export function buildMonthBucketsBR(months: number): MonthBucketLabel[] {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: BR_TIMEZONE,
  })
  const [y, m] = todayLocalBR().split("-").map(Number)
  const buckets: MonthBucketLabel[] = []

  for (let i = months - 1; i >= 0; i--) {
    let month = m - i
    let year = y
    while (month < 1) {
      month += 12
      year -= 1
    }
    while (month > 12) {
      month -= 12
      year += 1
    }
    const yearMonth = `${year}-${String(month).padStart(2, "0")}`
    const label = fmt
      .format(new Date(`${yearMonth}-15T12:00:00${BR_OFFSET}`))
      .replace(".", "")
      .replace(" de ", "/")
    buckets.push({ yearMonth, label })
  }

  return buckets
}

export type WeekRange = { startIso: string; endIso: string }

/** Última semana fechada (segunda → domingo) no calendário BR. */
export function lastClosedWeekBR(reference?: Date): WeekRange {
  const today = reference ? formatDateInBR(reference) : todayLocalBR()
  const dow = getWeekdayIndexBR(today)
  const daysSinceLastSunday = dow === 0 ? 7 : dow
  const endIso = addDaysYMD(today, -daysSinceLastSunday)
  return {
    startIso: addDaysYMD(endIso, -6),
    endIso,
  }
}

export function previousWeekBR(week: WeekRange): WeekRange {
  return {
    startIso: addDaysYMD(week.startIso, -7),
    endIso: addDaysYMD(week.endIso, -7),
  }
}

/**
 * Formata uma string YYYY-MM-DD pra DD/MM/YYYY.
 * Pure string ops — sem Date pra evitar timezone bugs.
 */
export function formatDateBR(input: string): string {
  if (!input) return ""

  // Trata tanto YYYY-MM-DD quanto ISO completo
  const dateOnly = input.slice(0, 10)
  const [y, m, d] = dateOnly.split("-")
  if (!y || !m || !d) return input

  return `${d}/${m}/${y}`
}

/**
 * Pega o dia da semana abreviado (ex: "sab") em PT-BR de uma data YYYY-MM-DD,
 * tratando o input como data local BR (sem conversão UTC).
 */
export function getWeekdayLabel(dateStr: string): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BR_TIMEZONE,
    weekday: "short",
  }).format(new Date(`${dateStr.slice(0, 10)}T12:00:00${BR_OFFSET}`))
  return label.replace(".", "")
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function formatLocalISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Converte um timestamp UTC (ISO) pra string YYYY-MM-DD no fuso BR.
 * Útil pra agrupar paid_at por dia.
 */
export function utcToLocalDateBR(utcISO: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utcISO))
}

/**
 * Converte YYYY-MM-DD (data do banco/OFX) em timestamptz para paid_at,
 * usando meio-dia BR para evitar shift de dia nos gráficos.
 */
export function dateYMDToPaidAtBR(dateYMD: string): string {
  const d = dateYMD.slice(0, 10)
  return `${d}T12:00:00${BR_OFFSET}`
}

/** Primeiro e último dia do mês (YYYY-MM-DD). `month` é 1–12. */
export function getMonthDateBounds(
  year: number,
  month: number
): { from: string; to: string } {
  const lastDay = new Date(year, month, 0).getDate()
  const monthStr = String(month).padStart(2, "0")
  const lastDayStr = String(lastDay).padStart(2, "0")
  return {
    from: `${year}-${monthStr}-01`,
    to: `${year}-${monthStr}-${lastDayStr}`,
  }
}

/** Parse de `?month=YYYY-MM` para exibição da agenda. */
export function parseAgendaMonthParam(param?: string): {
  year: number
  month: number
} {
  const today = todayLocalBR()
  const [y, m] = today.split("-").map(Number)
  if (!param || !/^\d{4}-\d{2}$/.test(param)) {
    return { year: y, month: m }
  }
  const [py, pm] = param.split("-").map(Number)
  if (pm < 1 || pm > 12) return { year: y, month: m }
  return { year: py, month: pm }
}

export function formatAgendaMonthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

/** Soma dias a uma data YYYY-MM-DD (sem timezone). */
export function addDaysYMD(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d + days)
  return formatLocalISO(date)
}

export type MonthGridCell = { date: string; inMonth: boolean }

/** Grade de calendário (domingo = 1ª coluna), 6 semanas. */
export function getMonthGridDays(
  year: number,
  month: number
): MonthGridCell[] {
  const startDow = getWeekdayIndexBR(toYMD(year, month, 1))
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells: MonthGridCell[] = []

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevLastDay = new Date(prevYear, prevMonth, 0).getDate()

  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevLastDay - i
    cells.push({
      date: toYMD(prevYear, prevMonth, d),
      inMonth: false,
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: toYMD(year, month, d), inMonth: true })
  }

  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  let nextDay = 1
  while (cells.length < 42) {
    cells.push({
      date: toYMD(nextYear, nextMonth, nextDay),
      inMonth: false,
    })
    nextDay += 1
  }

  return cells
}

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Alias — aritmética pura em YYYY-MM-DD (sem fuso). */
export const addDaysIso = addDaysYMD
