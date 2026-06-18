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

/**
 * Data de "hoje" no fuso BR como string YYYY-MM-DD.
 * Não use `new Date().toISOString().slice(0,10)` — isso retorna em UTC
 * e dá problema à noite no Brasil.
 */
export function todayLocalBR(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
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
  const [y, m, d] = today.split("-").map(Number)

  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    // Usa Date construtor local pra subtrair dias — não envolve UTC
    const date = new Date(y, m - 1, d - i)
    const iso = formatLocalISO(date)
    days.push(iso)
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
    from: `${y}-${monthStr}-01T00:00:00-03:00`,
    to: `${y}-${monthStr}-${lastDayStr}T23:59:59-03:00`,
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
  const [y, m, d] = dateStr.split("-").map(Number)
  // Constrói Date em horário local (meio-dia pra evitar transições de DST)
  const date = new Date(y, m - 1, d, 12, 0, 0)
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
  }).format(date)
  // Remove ponto: "sáb." → "sáb"
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
  return `${d}T12:00:00-03:00`
}
