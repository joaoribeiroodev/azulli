/**
 * Gerador de alertas a partir de uma `ForecastSeries`.
 *
 * Cada alerta tem uma `key` determinística — se a situação mudar (data,
 * valor), a chave muda e o alerta volta mesmo que o usuário tenha
 * dispensado uma versão anterior.
 *
 * 100% pura: recebe série, devolve lista. UI/queries cuidam de filtrar
 * dispensados.
 */

import type {
  ForecastAlert,
  ForecastComponent,
  ForecastPoint,
  ForecastSeries,
} from "./types"

const LARGE_EXPENSE_RATIO = 0.2 // 20% do saldo de abertura
const LARGE_EXPENSE_MIN_AMOUNT = 500
const TIGHT_CASH_RATIO = 0.2 // saldo mínimo cai abaixo de 20% do atual
const MAX_ALERTS = 5

export function buildAlerts(series: ForecastSeries): ForecastAlert[] {
  const alerts: ForecastAlert[] = []

  alerts.push(...detectCashShortage(series))
  alerts.push(...detectLargeUpcomingExpenses(series))
  alerts.push(...detectTightCashFlow(series, alerts))

  // Ordena por severidade (critical > warning > info) e limita
  alerts.sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
  return alerts.slice(0, MAX_ALERTS)
}

// ---------------------------------------------------------------------------
// 1) cash_shortage — caixa fica negativo no horizonte
// ---------------------------------------------------------------------------

function detectCashShortage(series: ForecastSeries): ForecastAlert[] {
  const { summary } = series
  if (summary.daysUntilNegative === null) return []
  if (summary.minBalance >= 0) return []

  const days = summary.daysUntilNegative
  const dateLabel = formatBRDate(summary.minBalanceDate)
  const amountAbs = Math.abs(summary.minBalance)

  return [
    {
      key: `cash_shortage:${summary.minBalanceDate}:${roundCents(amountAbs)}`,
      kind: "cash_shortage",
      severity: "critical",
      title:
        days === 1
          ? "Seu caixa pode estourar amanhã"
          : `Seu caixa pode estourar em ${days} dias`,
      message: `Pelo cálculo atual, em ${dateLabel} o saldo previsto é negativo em ${formatBRL(
        amountAbs
      )}. Antecipe recebimentos ou adie despesas para evitar.`,
      occursOn: summary.minBalanceDate,
      amount: summary.minBalance,
      action: { label: "Ver lançamentos pendentes", href: "/lancamentos?status=pending" },
    },
  ]
}

// ---------------------------------------------------------------------------
// 2) large_expense_upcoming — despesa relevante nos próximos dias
// ---------------------------------------------------------------------------

function detectLargeUpcomingExpenses(
  series: ForecastSeries
): ForecastAlert[] {
  const { openingBalance, points } = series
  if (openingBalance <= 0) return []

  const threshold = Math.max(
    LARGE_EXPENSE_MIN_AMOUNT,
    openingBalance * LARGE_EXPENSE_RATIO
  )

  // Considera apenas os próximos 14 dias para evitar ruído
  const nextDays = points.slice(1, 15)

  const found = new Map<string, ForecastAlert>()

  for (const point of nextDays) {
    for (const c of point.components) {
      if (c.kind !== "scheduled_expense" && c.kind !== "recurring_expense")
        continue
      if (c.amount < threshold) continue

      const key = c.transactionId
        ? `large_expense:tx:${c.transactionId}:${roundCents(c.amount)}`
        : `large_expense:rec:${normalizeLabel(c.label)}:${point.date}:${roundCents(c.amount)}`

      if (found.has(key)) continue

      found.set(key, {
        key,
        kind: "large_expense_upcoming",
        severity: "warning",
        title: `Despesa de ${formatBRL(c.amount)} em ${formatBRDate(
          point.date
        )}`,
        message: `${c.label} representa ${Math.round(
          (c.amount / openingBalance) * 100
        )}% do seu saldo atual. Confirme se está previsto no caixa.`,
        occursOn: point.date,
        amount: c.amount,
        action: c.transactionId
          ? {
              label: "Ver lançamento",
              href: `/lancamentos?id=${c.transactionId}`,
            }
          : undefined,
      })
    }
  }

  return [...found.values()]
}

// ---------------------------------------------------------------------------
// 3) tight_cash_flow — saldo fica apertado (mas não negativo)
// ---------------------------------------------------------------------------

function detectTightCashFlow(
  series: ForecastSeries,
  existingAlerts: ForecastAlert[]
): ForecastAlert[] {
  // Não duplica com cash_shortage (que já é mais grave)
  if (existingAlerts.some((a) => a.kind === "cash_shortage")) return []

  const { openingBalance, summary } = series
  if (openingBalance <= 0) return []
  if (summary.minBalance < 0) return []

  // Saldo mínimo cai abaixo de 20% do atual?
  if (summary.minBalance >= openingBalance * TIGHT_CASH_RATIO) return []

  const dropPct = Math.round(
    (1 - summary.minBalance / openingBalance) * 100
  )

  return [
    {
      key: `tight_cash:${summary.minBalanceDate}:${roundCents(
        summary.minBalance
      )}`,
      kind: "cash_shortage", // reusa o tipo (mesma família visual)
      severity: "warning",
      title: "Caixa fica apertado no período",
      message: `Em ${formatBRDate(
        summary.minBalanceDate
      )} o saldo previsto cai para ${formatBRL(
        summary.minBalance
      )} (${dropPct}% abaixo do atual). Vale revisar o que pode ser adiado.`,
      occursOn: summary.minBalanceDate,
      amount: summary.minBalance,
      action: { label: "Ver pendentes", href: "/lancamentos?status=pending" },
    },
  ]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityRank(s: ForecastAlert["severity"]): number {
  switch (s) {
    case "critical":
      return 3
    case "warning":
      return 2
    case "info":
      return 1
  }
}

function roundCents(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}

function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").slice(0, 30)
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatBRDate(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y.slice(2)}`
}

// Mantido pra possíveis futuros heurísticos referenciando ponto/componente
export type AlertContext = {
  point: ForecastPoint
  component: ForecastComponent
}
