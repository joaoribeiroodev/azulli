/**
 * Tipos da Fase 9 — Previsão de Fluxo de Caixa.
 *
 * O engine (9B) consome dados reais de transações + recorrentes detectadas
 * e produz uma `ForecastSeries`. UI (9C), alertas (9D) e simulador (9E)
 * consomem esses tipos.
 */

// ---------------------------------------------------------------------------
// Horizonte e ponto da projeção
// ---------------------------------------------------------------------------

export type ForecastHorizon = 30 | 60 | 90

/**
 * Um único dia da projeção.
 *
 * - `realized`: receitas/despesas já efetivadas (paid) no dia. Só preenchido
 *   no ponto "hoje" como referência. Pra dias passados, o engine não retorna
 *   pontos — projeta apenas pra frente.
 * - `expected`: melhor estimativa do dia (pendentes confirmados + recorrentes).
 * - `low/high`: intervalo de confiança (±15% sobre o componente projetado).
 * - `balance`: saldo acumulado projetado ao fim do dia.
 */
export type ForecastPoint = {
  /** Data ISO local (YYYY-MM-DD, America/Sao_Paulo). */
  date: string
  /** Receita total esperada do dia (R$). */
  income: number
  /** Despesa total esperada do dia (R$). */
  expense: number
  /** income - expense. */
  net: number
  /** Saldo acumulado ao fim do dia. */
  balance: number
  /** Saldo no cenário pessimista (high expense / low income). */
  lowBalance: number
  /** Saldo no cenário otimista. */
  highBalance: number
  /**
   * Composição do dia — útil pra tooltip da UI sem ter que recalcular.
   * Cada item descreve uma das fontes que somam ao income/expense.
   */
  components: ForecastComponent[]
}

export type ForecastComponentKind =
  | "scheduled_income"
  | "scheduled_expense"
  | "recurring_expense"
  | "projected_income"

export type ForecastComponent = {
  kind: ForecastComponentKind
  label: string
  amount: number
  /** ID de transação (quando aplicável) — pra link "ver lançamento". */
  transactionId?: string
}

// ---------------------------------------------------------------------------
// Série completa
// ---------------------------------------------------------------------------

export type ForecastSeries = {
  /** Data/hora de geração (ISO UTC). */
  asOf: string
  /** Quantos dias o engine projetou. */
  horizonDays: ForecastHorizon
  /** Saldo realizado HOJE (entrada da série). */
  openingBalance: number
  /** Pontos diários, ordenados por data crescente. */
  points: ForecastPoint[]
  /** Sumário agregado. */
  summary: ForecastSummary
}

export type ForecastSummary = {
  /** Saldo previsto ao fim do horizonte. */
  finalBalance: number
  /** Menor saldo previsto durante o horizonte (pode ser negativo). */
  minBalance: number
  /** Data do menor saldo. */
  minBalanceDate: string
  /** Soma de receitas previstas. */
  totalIncome: number
  /** Soma de despesas previstas. */
  totalExpense: number
  /** Quantos dias até estourar o caixa (saldo < 0). null se não estoura. */
  daysUntilNegative: number | null
}

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

export type ForecastAlertSeverity = "info" | "warning" | "critical"

export type ForecastAlertKind =
  | "cash_shortage"
  | "large_expense_upcoming"
  | "recurring_increase"
  | "income_concentration"

export type ForecastAlert = {
  /** Hash determinístico — alterações no payload geram nova chave. */
  key: string
  kind: ForecastAlertKind
  severity: ForecastAlertSeverity
  title: string
  message: string
  /** Data ISO local relevante pro alerta (ex: dia que estoura caixa). */
  occursOn?: string
  /** Valor associado (R$) — opcional, depende do tipo. */
  amount?: number
  /** Sugestão de ação: link interno. */
  action?: { label: string; href: string }
}

// ---------------------------------------------------------------------------
// Simulador "e se?"
// ---------------------------------------------------------------------------

export type WhatIfAdjustment =
  /** Adia uma despesa pendente em N dias. */
  | {
      kind: "delay_expense"
      transactionId: string
      delayDays: number
    }
  /** Antecipa um recebimento em N dias. */
  | {
      kind: "advance_income"
      transactionId: string
      advanceDays: number
    }
  /** Adiciona uma despesa hipotética. */
  | {
      kind: "add_expense"
      label: string
      amount: number
      date: string
    }
  /** Adiciona uma receita hipotética. */
  | {
      kind: "add_income"
      label: string
      amount: number
      date: string
    }
  /** Remove uma despesa pendente do cenário. */
  | {
      kind: "remove_expense"
      transactionId: string
    }

export type WhatIfScenario = {
  baseline: ForecastSeries
  adjusted: ForecastSeries
  /** Diferença em R$ no saldo final. */
  deltaFinalBalance: number
  /** Diferença em R$ no saldo mínimo. */
  deltaMinBalance: number
}

// ---------------------------------------------------------------------------
// Inputs do engine — fáceis de mockar em testes
// ---------------------------------------------------------------------------

export type ScheduledTx = {
  id: string
  type: "income" | "expense"
  amount: number
  /** YYYY-MM-DD. Para overdue, o engine "puxa" pra próximo dia útil. */
  dueDate: string
  description: string | null
  /** "pending" ou "overdue" — só não-pagas entram. */
  status: "pending" | "overdue"
}

export type RecurringTemplate = {
  fingerprint: string
  label: string
  monthlyAmount: number
  /** Última ocorrência observada (ISO YYYY-MM-DD). */
  lastSeen: string
}

export type ForecastEngineInput = {
  /** Saldo realizado hoje (em R$). */
  openingBalance: number
  /** Hoje em ISO local (YYYY-MM-DD, America/Sao_Paulo). */
  today: string
  /** Horizonte da projeção. */
  horizonDays: ForecastHorizon
  /** Lançamentos pendentes ou overdue. */
  scheduled: ScheduledTx[]
  /** Despesas recorrentes detectadas. */
  recurring: RecurringTemplate[]
  /**
   * Mediana de receita mensal histórica (últimos 6 meses) — usada como
   * "renda esperada" se não houver pendências. Opcional. Aplicada
   * proporcionalmente ao longo do horizonte.
   */
  historicalIncomeMedian?: number
}
