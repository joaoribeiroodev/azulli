"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wallet,
  CalendarDays,
  Sparkles,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChartPanel } from "@/components/app/chart-panel"
import { formatBRL } from "@/lib/utils/currency"
import type {
  ForecastComponent,
  ForecastHorizon,
  ForecastPoint,
  ForecastSeries,
  ForecastSummary,
} from "@/lib/forecast/types"

type Props = {
  /** Série completa pré-computada (90 dias). O cliente fatia conforme o horizonte selecionado. */
  series: ForecastSeries
}

const HORIZONS: ForecastHorizon[] = [30, 60, 90]

export function CashFlowForecastCard({ series }: Props) {
  const [horizon, setHorizon] = useState<ForecastHorizon>(30)

  const sliced = useMemo(() => sliceSeries(series, horizon), [series, horizon])

  const isEmpty =
    sliced.summary.totalIncome === 0 && sliced.summary.totalExpense === 0

  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Previsão de fluxo de caixa</CardTitle>
          <CardDescription>
            Projeção dos próximos {horizon} dias com base em pendentes,
            recorrentes detectadas e histórico.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 self-start">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-brand hover:text-brand-hover">
            <Link href="/dashboard/simulador">
              <Sparkles className="h-3.5 w-3.5" />
              Simular
            </Link>
          </Button>
          <HorizonToggle horizon={horizon} onChange={setHorizon} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <KpiStrip series={sliced} horizon={horizon} />

        {isEmpty ? (
          <EmptyState />
        ) : (
          <ForecastChart points={sliced.points} />
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Toggle 30 / 60 / 90 dias
// ---------------------------------------------------------------------------

function HorizonToggle({
  horizon,
  onChange,
}: {
  horizon: ForecastHorizon
  onChange: (h: ForecastHorizon) => void
}) {
  return (
    <div
      role="tablist"
      className="inline-flex rounded-md border bg-muted/40 p-0.5 self-start"
    >
      {HORIZONS.map((h) => {
        const active = h === horizon
        return (
          <button
            key={h}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(h)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded transition-colors",
              active
                ? "bg-background text-brand shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {h}d
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPIs (saldo atual / saldo previsto / saldo mínimo / alerta de estouro)
// ---------------------------------------------------------------------------

function KpiStrip({
  series,
  horizon,
}: {
  series: ForecastSeries
  horizon: ForecastHorizon
}) {
  const { openingBalance, summary } = series
  const finalPositive = summary.finalBalance >= 0
  const willGoNegative = summary.daysUntilNegative !== null
  const minBalance = summary.minBalance
  const minDate = formatBRDate(summary.minBalanceDate)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi
        icon={<Wallet className="h-4 w-4 text-brand" />}
        label="Saldo atual"
        value={formatBRL(openingBalance)}
      />
      <Kpi
        icon={
          finalPositive ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )
        }
        label={`Saldo previsto em ${horizon}d`}
        value={formatBRL(summary.finalBalance)}
        valueClass={finalPositive ? "text-success-ink" : "text-destructive"}
      />
      <Kpi
        icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
        label="Menor saldo no período"
        value={formatBRL(minBalance)}
        sub={minDate ? `em ${minDate}` : undefined}
        valueClass={minBalance < 0 ? "text-destructive" : undefined}
      />
      {willGoNegative ? (
        <Kpi
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          label="Atenção: caixa estoura em"
          value={`${summary.daysUntilNegative} ${
            summary.daysUntilNegative === 1 ? "dia" : "dias"
          }`}
          valueClass="text-destructive"
          highlight
        />
      ) : (
        <Kpi
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          label="Movimentação prevista"
          value={`${formatBRL(summary.totalIncome)} ↑`}
          sub={`${formatBRL(summary.totalExpense)} ↓`}
        />
      )}
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
  sub,
  valueClass,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  valueClass?: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        highlight ? "bg-destructive/5 border-destructive/30" : "bg-card"
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-base font-semibold tabular-nums",
          valueClass
        )}
      >
        {value}
      </div>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gráfico
// ---------------------------------------------------------------------------

type ChartDatum = {
  dateIso: string
  label: string
  balance: number
  lowBalance: number
  highBalance: number
  /** Diferença pra preencher o Area (high - low). */
  range: [number, number]
  components: ForecastComponent[]
}

function ForecastChart({ points }: { points: ForecastPoint[] }) {
  const data: ChartDatum[] = points.map((p) => ({
    dateIso: p.date,
    label: shortBRDate(p.date),
    balance: p.balance,
    lowBalance: p.lowBalance,
    highBalance: p.highBalance,
    range: [p.lowBalance, p.highBalance],
    components: p.components,
  }))

  return (
    <ChartPanel className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="forecastConfidence" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
            opacity={0.5}
          />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            stroke="var(--muted-foreground)"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            stroke="var(--muted-foreground)"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000
                ? `${(v / 1000).toFixed(0)}k`
                : String(Math.round(v))
            }
            width={48}
          />

          <Tooltip
            cursor={{ stroke: "var(--brand)", strokeOpacity: 0.3 }}
            content={<ForecastTooltip />}
          />

          <ReferenceLine
            y={0}
            stroke="var(--destructive)"
            strokeOpacity={0.6}
            strokeDasharray="4 2"
          />

          <Area
            type="monotone"
            dataKey="range"
            stroke="none"
            fill="url(#forecastConfidence)"
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="balance"
            stroke="var(--brand)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartPanel>
  )
}

// ---------------------------------------------------------------------------
// Tooltip rico
// ---------------------------------------------------------------------------

type RechartsTooltipProps = {
  active?: boolean
  payload?: Array<{ payload: ChartDatum }>
}

function ForecastTooltip({ active, payload }: RechartsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0].payload

  const visibleComponents = datum.components.slice(0, 3)
  const hiddenCount = Math.max(0, datum.components.length - 3)

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md min-w-[220px]">
      <p className="text-xs font-medium text-foreground">
        {longBRDate(datum.dateIso)}
      </p>

      <div className="mt-2 space-y-1 text-xs">
        <Row
          label="Saldo previsto"
          value={formatBRL(datum.balance)}
          strong
          valueClass={datum.balance < 0 ? "text-destructive" : undefined}
        />
        <Row
          label="Faixa estimada"
          value={`${formatBRL(datum.lowBalance)} — ${formatBRL(
            datum.highBalance
          )}`}
          muted
        />
      </div>

      {visibleComponents.length > 0 && (
        <div className="mt-2 pt-2 border-t space-y-1">
          {visibleComponents.map((c, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-xs">
              <span
                className={cn(
                  "truncate max-w-[150px]",
                  c.kind === "scheduled_income" || c.kind === "projected_income"
                    ? "text-success-ink"
                    : "text-destructive"
                )}
              >
                {componentPrefix(c.kind)} {c.label}
              </span>
              <span className="tabular-nums font-medium">
                {c.kind === "scheduled_income" || c.kind === "projected_income"
                  ? "+"
                  : "−"}
                {formatBRL(c.amount)}
              </span>
            </div>
          ))}
          {hiddenCount > 0 && (
            <p className="text-[10px] text-muted-foreground">
              +{hiddenCount} {hiddenCount === 1 ? "outro" : "outros"}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  strong,
  muted,
  valueClass,
}: {
  label: string
  value: string
  strong?: boolean
  muted?: boolean
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          strong && "font-semibold",
          muted && "text-muted-foreground",
          valueClass
        )}
      >
        {value}
      </span>
    </div>
  )
}

function componentPrefix(kind: ForecastComponent["kind"]): string {
  switch (kind) {
    case "scheduled_income":
      return "→"
    case "projected_income":
      return "≈"
    case "scheduled_expense":
      return "→"
    case "recurring_expense":
      return "↻"
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="h-72 flex items-center justify-center">
      <div className="text-center max-w-sm">
        <p className="text-sm text-muted-foreground">
          Sem movimentação prevista no período.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Cadastre lançamentos pendentes (a receber/pagar) ou importe seu
          extrato para que a previsão fique mais precisa.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Slicing client-side: corta a série pra horizonte menor e recalcula sumário
// ---------------------------------------------------------------------------

function sliceSeries(
  series: ForecastSeries,
  horizon: ForecastHorizon
): ForecastSeries {
  if (series.horizonDays === horizon) return series

  // ponto[0] = today, então pegamos 1 + horizon pontos
  const slicedPoints = series.points.slice(0, 1 + horizon)
  const projected = slicedPoints.slice(1)

  let totalIncome = 0
  let totalExpense = 0
  let minBalance = series.openingBalance
  let minBalanceDate = slicedPoints[0]?.date ?? ""
  let daysUntilNegative: number | null = null

  for (let i = 0; i < projected.length; i++) {
    const p = projected[i]
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

  const summary: ForecastSummary = {
    finalBalance: projected.at(-1)?.balance ?? series.openingBalance,
    minBalance,
    minBalanceDate,
    totalIncome: round2(totalIncome),
    totalExpense: round2(totalExpense),
    daysUntilNegative,
  }

  return {
    ...series,
    horizonDays: horizon,
    points: slicedPoints,
    summary,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ---------------------------------------------------------------------------
// Formatadores BR de data (sem dependência externa)
// ---------------------------------------------------------------------------

function shortBRDate(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

function formatBRDate(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y.slice(2)}`
}

const WEEKDAYS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
]

function longBRDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const weekday = WEEKDAYS[date.getUTCDay()]
  return `${weekday}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`
}
