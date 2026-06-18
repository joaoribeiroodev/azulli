/**
 * Simulador "e se?" — aplica ajustes em cima de um `ForecastEngineInput`
 * baseline e devolve o cenário ajustado + deltas.
 */

import { computeForecast } from "./engine"
import type {
  ForecastEngineInput,
  ScheduledTx,
  WhatIfAdjustment,
  WhatIfScenario,
} from "./types"

// ---------------------------------------------------------------------------
// applyAdjustments — função pura que muta uma cópia do input
// ---------------------------------------------------------------------------

export function applyAdjustments(
  baseline: ForecastEngineInput,
  adjustments: WhatIfAdjustment[]
): ForecastEngineInput {
  // clone raso suficiente — não mexemos em recurring/historical
  const next: ForecastEngineInput = {
    ...baseline,
    scheduled: baseline.scheduled.map((tx) => ({ ...tx })),
  }

  let hypotheticalCounter = 0

  for (const adj of adjustments) {
    switch (adj.kind) {
      case "delay_expense": {
        const tx = next.scheduled.find(
          (t) => t.id === adj.transactionId && t.type === "expense"
        )
        if (!tx) continue
        tx.dueDate = addDaysIso(tx.dueDate, adj.delayDays)
        // Se ficou após o overdue threshold, ainda assim mantemos como pending
        tx.status = "pending"
        break
      }

      case "advance_income": {
        const tx = next.scheduled.find(
          (t) => t.id === adj.transactionId && t.type === "income"
        )
        if (!tx) continue
        tx.dueDate = addDaysIso(tx.dueDate, -adj.advanceDays)
        tx.status =
          tx.dueDate < next.today ? "overdue" : "pending"
        break
      }

      case "add_expense": {
        if (adj.amount <= 0) continue
        const ghost: ScheduledTx = {
          id: `whatif:exp:${++hypotheticalCounter}`,
          type: "expense",
          amount: adj.amount,
          dueDate: adj.date,
          description: adj.label || "Despesa hipotética",
          status: adj.date < next.today ? "overdue" : "pending",
        }
        next.scheduled.push(ghost)
        break
      }

      case "add_income": {
        if (adj.amount <= 0) continue
        const ghost: ScheduledTx = {
          id: `whatif:inc:${++hypotheticalCounter}`,
          type: "income",
          amount: adj.amount,
          dueDate: adj.date,
          description: adj.label || "Receita hipotética",
          status: adj.date < next.today ? "overdue" : "pending",
        }
        next.scheduled.push(ghost)
        break
      }

      case "remove_expense": {
        next.scheduled = next.scheduled.filter(
          (t) => !(t.id === adj.transactionId && t.type === "expense")
        )
        break
      }
    }
  }

  return next
}

// ---------------------------------------------------------------------------
// simulate — atalho que aplica + computa + devolve cenário comparativo
// ---------------------------------------------------------------------------

export function simulate(
  baseline: ForecastEngineInput,
  adjustments: WhatIfAdjustment[]
): WhatIfScenario {
  const baselineSeries = computeForecast(baseline)
  const adjustedInput = applyAdjustments(baseline, adjustments)
  const adjustedSeries = computeForecast(adjustedInput)

  return {
    baseline: baselineSeries,
    adjusted: adjustedSeries,
    deltaFinalBalance: round2(
      adjustedSeries.summary.finalBalance -
        baselineSeries.summary.finalBalance
    ),
    deltaMinBalance: round2(
      adjustedSeries.summary.minBalance -
        baselineSeries.summary.minBalance
    ),
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
