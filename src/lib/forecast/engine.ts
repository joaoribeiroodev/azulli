/**
 * Engine de Previsão de Fluxo de Caixa — Fase 9B.
 *
 * Função pura (sem I/O) que recebe `ForecastEngineInput` e devolve uma
 * `ForecastSeries` com 1 + N pontos diários (today + horizonDays projeções).
 *
 * Estratégia:
 *   1. Inicializa um ponto por dia no horizonte (income=0, expense=0).
 *   2. Distribui lançamentos `scheduled` (pending/overdue) na due_date deles.
 *      Overdue caem no primeiro dia da projeção (today+1).
 *   3. Projeta despesas recorrentes para frente, mensalmente, a partir da
 *      próxima data esperada (lastSeen + 30d, capada para ficar dentro do
 *      horizonte).
 *   4. Se não há receitas pendentes, distribui a mediana mensal histórica
 *      uniformemente — assumindo que continuará entrando mais ou menos
 *      no mesmo ritmo.
 *   5. Calcula saldo acumulado + intervalo de confiança ±15% sobre a
 *      parcela *projetada* (recorrentes + histórico). Lançamentos com data
 *      definida (scheduled) entram com 0% de spread.
 *   6. Calcula sumário (final, mínimo, days_until_negative).
 */

import type {
  ForecastComponent,
  ForecastEngineInput,
  ForecastPoint,
  ForecastSeries,
  ForecastSummary,
} from "./types"

const SPREAD = 0.15
const MONTHLY_INTERVAL_DAYS = 30

// ---------------------------------------------------------------------------
// Helpers de data (sem dependências externas, sempre tratam ISO YYYY-MM-DD)
// ---------------------------------------------------------------------------

function addDays(isoDate: string, days: number): string {
  // Constrói em UTC pra evitar problemas de DST e devolve YYYY-MM-DD.
  const [y, m, d] = isoDate.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function emptyPoint(date: string): ForecastPoint {
  return {
    date,
    income: 0,
    expense: 0,
    net: 0,
    balance: 0,
    lowBalance: 0,
    highBalance: 0,
    components: [],
  }
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

export function computeForecast(input: ForecastEngineInput): ForecastSeries {
  const {
    openingBalance,
    today,
    horizonDays,
    scheduled,
    recurring,
    historicalIncomeMedian = 0,
  } = input

  const lastDate = addDays(today, horizonDays)

  // 1) Map<dateIso, ForecastPoint> com 1 entrada por dia (today+1 .. today+N)
  const dayMap = new Map<string, ForecastPoint>()
  for (let i = 1; i <= horizonDays; i++) {
    const d = addDays(today, i)
    dayMap.set(d, emptyPoint(d))
  }

  // 2) Scheduled (pending/overdue)
  for (const tx of scheduled) {
    let date = tx.dueDate
    if (tx.status === "overdue" || compareDates(date, today) <= 0) {
      // Overdue ou no mesmo dia → puxa pra primeiro dia da projeção
      date = addDays(today, 1)
    }
    if (compareDates(date, lastDate) > 0) continue // fora do horizonte

    const point = dayMap.get(date)
    if (!point) continue

    const label = tx.description?.trim() || (tx.type === "income" ? "Receita" : "Despesa")
    const component: ForecastComponent = {
      kind: tx.type === "income" ? "scheduled_income" : "scheduled_expense",
      label,
      amount: tx.amount,
      transactionId: tx.id,
    }

    if (tx.type === "income") {
      point.income += tx.amount
    } else {
      point.expense += tx.amount
    }
    point.components.push(component)
  }

  // 3) Recorrentes — projeta para frente
  for (const r of recurring) {
    let nextDate = nextRecurringOccurrence(r.lastSeen, today)
    let safety = 0
    while (compareDates(nextDate, lastDate) <= 0 && safety < 12) {
      const point = dayMap.get(nextDate)
      if (point) {
        point.expense += r.monthlyAmount
        point.components.push({
          kind: "recurring_expense",
          label: r.label,
          amount: r.monthlyAmount,
        })
      }
      nextDate = addDays(nextDate, MONTHLY_INTERVAL_DAYS)
      safety++
    }
  }

  // 4) Receita histórica (só se NÃO houver scheduled income)
  const hasScheduledIncome = scheduled.some((t) => t.type === "income")
  const useHistoricalIncome =
    !hasScheduledIncome && historicalIncomeMedian > 0

  if (useHistoricalIncome) {
    const dailyIncome = historicalIncomeMedian / 30
    for (const point of dayMap.values()) {
      point.income += dailyIncome
      point.components.push({
        kind: "projected_income",
        label: "Receita esperada (histórico)",
        amount: dailyIncome,
      })
    }
  }

  // 5) Saldo acumulado + bandas de confiança
  const orderedPoints = [...dayMap.values()].sort((a, b) =>
    compareDates(a.date, b.date)
  )

  let balance = openingBalance
  let lowBalance = openingBalance
  let highBalance = openingBalance

  for (const p of orderedPoints) {
    // Composição "projetada" (incerteza ±SPREAD)
    let projectedIncome = 0
    let projectedExpense = 0
    for (const c of p.components) {
      if (c.kind === "projected_income") projectedIncome += c.amount
      if (c.kind === "recurring_expense") projectedExpense += c.amount
    }

    p.net = round2(p.income - p.expense)
    balance += p.net
    p.balance = round2(balance)

    // Pessimista: receita projetada cai SPREAD%, despesa projetada sobe SPREAD%
    const pessNet =
      p.net - projectedIncome * SPREAD - projectedExpense * SPREAD
    lowBalance += pessNet
    p.lowBalance = round2(lowBalance)

    // Otimista: receita projetada sobe SPREAD%, despesa projetada cai SPREAD%
    const optNet = p.net + projectedIncome * SPREAD + projectedExpense * SPREAD
    highBalance += optNet
    p.highBalance = round2(highBalance)

    // Arredonda income/expense também
    p.income = round2(p.income)
    p.expense = round2(p.expense)
  }

  // 6) Sumário
  const summary = buildSummary(orderedPoints, openingBalance)

  // 7) Insere o ponto "hoje" (referência) no início
  const todayPoint: ForecastPoint = {
    date: today,
    income: 0,
    expense: 0,
    net: 0,
    balance: round2(openingBalance),
    lowBalance: round2(openingBalance),
    highBalance: round2(openingBalance),
    components: [],
  }

  return {
    asOf: new Date().toISOString(),
    horizonDays,
    openingBalance: round2(openingBalance),
    points: [todayPoint, ...orderedPoints],
    summary,
  }
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Calcula a próxima data esperada de uma despesa recorrente.
 * Adiciona 30 dias ao `lastSeen` enquanto a data continuar antes de `today`.
 */
function nextRecurringOccurrence(lastSeen: string, today: string): string {
  let next = addDays(lastSeen, MONTHLY_INTERVAL_DAYS)
  let safety = 0
  while (compareDates(next, today) <= 0 && safety < 24) {
    next = addDays(next, MONTHLY_INTERVAL_DAYS)
    safety++
  }
  return next
}

function buildSummary(
  points: ForecastPoint[],
  openingBalance: number
): ForecastSummary {
  if (points.length === 0) {
    return {
      finalBalance: round2(openingBalance),
      minBalance: round2(openingBalance),
      minBalanceDate: "",
      totalIncome: 0,
      totalExpense: 0,
      daysUntilNegative: null,
    }
  }

  let totalIncome = 0
  let totalExpense = 0
  let minBalance = openingBalance
  let minBalanceDate = points[0].date
  let daysUntilNegative: number | null = null

  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    totalIncome += p.income
    totalExpense += p.expense

    if (p.balance < minBalance) {
      minBalance = p.balance
      minBalanceDate = p.date
    }

    if (daysUntilNegative === null && p.balance < 0) {
      daysUntilNegative = i + 1
    }
  }

  return {
    finalBalance: round2(points.at(-1)!.balance),
    minBalance: round2(minBalance),
    minBalanceDate,
    totalIncome: round2(totalIncome),
    totalExpense: round2(totalExpense),
    daysUntilNegative,
  }
}
