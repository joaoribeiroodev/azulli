"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Loader2,
} from "lucide-react"
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts"
import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatBRL } from "@/lib/utils/currency"
import { simulateAction } from "@/lib/forecast/actions"
import type {
  ForecastHorizon,
  ForecastSeries,
  ScheduledTx,
  WhatIfAdjustment,
  WhatIfScenario,
} from "@/lib/forecast/types"

type Props = {
  baselineSeries: ForecastSeries
  scheduled: ScheduledTx[]
  today: string
}

type AdjustmentRow = {
  uid: string // chave React local
  data: WhatIfAdjustment
}

const HORIZONS: ForecastHorizon[] = [30, 60, 90]

export function SimulatorShell({
  baselineSeries,
  scheduled,
  today,
}: Props) {
  const [horizon, setHorizon] = useState<ForecastHorizon>(30)
  const [rows, setRows] = useState<AdjustmentRow[]>([])
  const [scenario, setScenario] = useState<WhatIfScenario>({
    baseline: baselineSeries,
    adjusted: baselineSeries,
    deltaFinalBalance: 0,
    deltaMinBalance: 0,
  })
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<number | null>(null)

  // Sempre que horizon ou rows mudarem, recalcula via Server Action (debounced)
  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => {
      const adjustments = rows
        .map((r) => r.data)
        .filter((a) => isComplete(a))

      startTransition(async () => {
        const result = await simulateAction(horizon, adjustments)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        setScenario(result.data)
      })
    }, 350)

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [horizon, rows])

  // ---- Helpers de mutação ----

  function addRow(template: WhatIfAdjustment) {
    setRows((cur) => [
      ...cur,
      { uid: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, data: template },
    ])
  }

  function removeRow(uid: string) {
    setRows((cur) => cur.filter((r) => r.uid !== uid))
  }

  function updateRow(uid: string, patch: WhatIfAdjustment) {
    setRows((cur) => cur.map((r) => (r.uid === uid ? { ...r, data: patch } : r)))
  }

  function clearAll() {
    setRows([])
  }

  // ---- Listas filtradas ----
  const pendingExpenses = useMemo(
    () => scheduled.filter((t) => t.type === "expense"),
    [scheduled]
  )
  const pendingIncomes = useMemo(
    () => scheduled.filter((t) => t.type === "income"),
    [scheduled]
  )

  // ---- Render ----
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 lg:gap-6">
      <SimulatorSidebar
        rows={rows}
        horizon={horizon}
        onHorizonChange={setHorizon}
        onAdd={addRow}
        onRemove={removeRow}
        onUpdate={updateRow}
        onClear={clearAll}
        pendingExpenses={pendingExpenses}
        pendingIncomes={pendingIncomes}
        today={today}
      />

      <SimulatorMain scenario={scenario} pending={isPending} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar (esquerda) — controles de ajuste
// ---------------------------------------------------------------------------

function SimulatorSidebar({
  rows,
  horizon,
  onHorizonChange,
  onAdd,
  onRemove,
  onUpdate,
  onClear,
  pendingExpenses,
  pendingIncomes,
  today,
}: {
  rows: AdjustmentRow[]
  horizon: ForecastHorizon
  onHorizonChange: (h: ForecastHorizon) => void
  onAdd: (template: WhatIfAdjustment) => void
  onRemove: (uid: string) => void
  onUpdate: (uid: string, patch: WhatIfAdjustment) => void
  onClear: () => void
  pendingExpenses: ScheduledTx[]
  pendingIncomes: ScheduledTx[]
  today: string
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Ajustes</CardTitle>
            <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-0.5">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => onHorizonChange(h)}
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded transition-colors",
                    h === horizon
                      ? "bg-background text-brand shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {h}d
                </button>
              ))}
            </div>
          </div>
          <CardDescription>
            Tudo é hipotético. Seus lançamentos reais não são alterados.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Adicione um ajuste pra começar a simular.
            </p>
          ) : (
            rows.map((row) => (
              <AdjustmentEditor
                key={row.uid}
                row={row}
                onRemove={() => onRemove(row.uid)}
                onChange={(next) => onUpdate(row.uid, next)}
                pendingExpenses={pendingExpenses}
                pendingIncomes={pendingIncomes}
              />
            ))
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <AddAdjustmentMenu
              onAdd={onAdd}
              today={today}
              hasPendingExpenses={pendingExpenses.length > 0}
              hasPendingIncomes={pendingIncomes.length > 0}
            />
            {rows.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-muted-foreground"
              >
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AddAdjustmentMenu({
  onAdd,
  today,
  hasPendingExpenses,
  hasPendingIncomes,
}: {
  onAdd: (template: WhatIfAdjustment) => void
  today: string
  hasPendingExpenses: boolean
  hasPendingIncomes: boolean
}) {
  const tomorrow = addDays(today, 7)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="bg-brand hover:bg-brand-hover gap-2">
          <Plus className="h-4 w-4" />
          Adicionar ajuste
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() =>
            onAdd({
              kind: "add_expense",
              label: "",
              amount: 0,
              date: tomorrow,
            })
          }
        >
          Adicionar despesa hipotética
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            onAdd({
              kind: "add_income",
              label: "",
              amount: 0,
              date: tomorrow,
            })
          }
        >
          Adicionar receita hipotética
        </DropdownMenuItem>
        {hasPendingExpenses && (
          <>
            <DropdownMenuItem
              onClick={() =>
                onAdd({
                  kind: "delay_expense",
                  transactionId: "",
                  delayDays: 7,
                })
              }
            >
              Adiar despesa pendente
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onAdd({
                  kind: "remove_expense",
                  transactionId: "",
                })
              }
            >
              Cancelar despesa pendente
            </DropdownMenuItem>
          </>
        )}
        {hasPendingIncomes && (
          <DropdownMenuItem
            onClick={() =>
              onAdd({
                kind: "advance_income",
                transactionId: "",
                advanceDays: 7,
              })
            }
          >
            Antecipar receita pendente
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Editor de cada linha de ajuste
// ---------------------------------------------------------------------------

function AdjustmentEditor({
  row,
  onRemove,
  onChange,
  pendingExpenses,
  pendingIncomes,
}: {
  row: AdjustmentRow
  onRemove: () => void
  onChange: (data: WhatIfAdjustment) => void
  pendingExpenses: ScheduledTx[]
  pendingIncomes: ScheduledTx[]
}) {
  const { data } = row

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2 relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">
          {kindLabel(data.kind)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover ajuste"
          className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {(data.kind === "add_expense" || data.kind === "add_income") && (
        <div className="space-y-2">
          <FieldRow>
            <Label className="text-xs">Descrição</Label>
            <Input
              value={data.label}
              placeholder={
                data.kind === "add_expense" ? "Ex: Equipamento" : "Ex: Projeto extra"
              }
              onChange={(e) =>
                onChange({ ...data, label: e.target.value })
              }
              className="h-8"
            />
          </FieldRow>
          <div className="grid grid-cols-2 gap-2">
            <FieldRow>
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={data.amount || ""}
                onChange={(e) =>
                  onChange({ ...data, amount: Number(e.target.value) || 0 })
                }
                className="h-8"
              />
            </FieldRow>
            <FieldRow>
              <Label className="text-xs">Data</Label>
              <Input
                type="date"
                value={data.date}
                onChange={(e) => onChange({ ...data, date: e.target.value })}
                className="h-8"
              />
            </FieldRow>
          </div>
        </div>
      )}

      {(data.kind === "delay_expense" ||
        data.kind === "remove_expense") && (
        <div className="space-y-2">
          <FieldRow>
            <Label className="text-xs">Despesa pendente</Label>
            <TxSelect
              transactions={pendingExpenses}
              value={data.transactionId}
              onChange={(id) => onChange({ ...data, transactionId: id })}
            />
          </FieldRow>
          {data.kind === "delay_expense" && (
            <FieldRow>
              <Label className="text-xs">Adiar em (dias)</Label>
              <Input
                type="number"
                min="1"
                max="180"
                value={data.delayDays}
                onChange={(e) =>
                  onChange({
                    ...data,
                    delayDays: Math.max(
                      1,
                      Math.min(180, Number(e.target.value) || 1)
                    ),
                  })
                }
                className="h-8"
              />
            </FieldRow>
          )}
        </div>
      )}

      {data.kind === "advance_income" && (
        <div className="space-y-2">
          <FieldRow>
            <Label className="text-xs">Receita pendente</Label>
            <TxSelect
              transactions={pendingIncomes}
              value={data.transactionId}
              onChange={(id) => onChange({ ...data, transactionId: id })}
            />
          </FieldRow>
          <FieldRow>
            <Label className="text-xs">Antecipar em (dias)</Label>
            <Input
              type="number"
              min="1"
              max="180"
              value={data.advanceDays}
              onChange={(e) =>
                onChange({
                  ...data,
                  advanceDays: Math.max(
                    1,
                    Math.min(180, Number(e.target.value) || 1)
                  ),
                })
              }
              className="h-8"
            />
          </FieldRow>
        </div>
      )}
    </div>
  )
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>
}

function TxSelect({
  transactions,
  value,
  onChange,
}: {
  transactions: ScheduledTx[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Selecione…" />
      </SelectTrigger>
      <SelectContent>
        {transactions.map((tx) => (
          <SelectItem key={tx.id} value={tx.id} className="text-xs">
            <span className="truncate max-w-[200px] inline-block align-bottom">
              {tx.description ?? "Sem descrição"}
            </span>{" "}
            — {formatBRL(tx.amount)} ({formatBRDate(tx.dueDate)})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ---------------------------------------------------------------------------
// Painel principal — KPIs delta + gráfico comparativo
// ---------------------------------------------------------------------------

function SimulatorMain({
  scenario,
  pending,
}: {
  scenario: WhatIfScenario
  pending: boolean
}) {
  const { baseline, adjusted, deltaFinalBalance, deltaMinBalance } = scenario

  const merged = useMemo(() => {
    const map = new Map<string, { date: string; baseline: number; adjusted: number }>()
    for (const p of baseline.points) {
      map.set(p.date, { date: p.date, baseline: p.balance, adjusted: p.balance })
    }
    for (const p of adjusted.points) {
      const existing = map.get(p.date)
      if (existing) existing.adjusted = p.balance
      else map.set(p.date, { date: p.date, baseline: p.balance, adjusted: p.balance })
    }
    return [...map.values()].sort((a, b) =>
      a.date < b.date ? -1 : 1
    )
  }, [baseline.points, adjusted.points])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DeltaKpi
          label="Saldo final"
          baseline={baseline.summary.finalBalance}
          adjusted={adjusted.summary.finalBalance}
          delta={deltaFinalBalance}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <DeltaKpi
          label="Saldo mínimo"
          baseline={baseline.summary.minBalance}
          adjusted={adjusted.summary.minBalance}
          delta={deltaMinBalance}
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <ShortageKpi
          baselineDays={baseline.summary.daysUntilNegative}
          adjustedDays={adjusted.summary.daysUntilNegative}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Comparativo de saldos</CardTitle>
            <CardDescription>
              Linha tracejada = sem ajustes · linha contínua = com ajustes
            </CardDescription>
          </div>
          {pending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <ComparisonChart data={merged} />
        </CardContent>
      </Card>
    </div>
  )
}

function DeltaKpi({
  label,
  baseline,
  adjusted,
  delta,
  icon,
}: {
  label: string
  baseline: number
  adjusted: number
  delta: number
  icon: React.ReactNode
}) {
  const isImprovement = delta >= 0
  const showDelta = Math.abs(delta) >= 0.01
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
        {showDelta && (
          <span
            className={cn(
              "text-[11px] font-semibold tabular-nums",
              isImprovement ? "text-success-ink" : "text-destructive"
            )}
          >
            {isImprovement ? "+" : ""}
            {formatBRL(delta)}
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground line-through tabular-nums">
          {formatBRL(baseline)}
        </span>
        <span
          className={cn(
            "text-base font-semibold tabular-nums",
            adjusted < 0 && "text-destructive"
          )}
        >
          {formatBRL(adjusted)}
        </span>
      </div>
    </div>
  )
}

function ShortageKpi({
  baselineDays,
  adjustedDays,
}: {
  baselineDays: number | null
  adjustedDays: number | null
}) {
  const fixed = baselineDays !== null && adjustedDays === null
  const broke = baselineDays === null && adjustedDays !== null

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-1",
        fixed && "bg-success/5 border-success/30",
        broke && "bg-destructive/5 border-destructive/30",
        !fixed && !broke && "bg-card"
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        Risco de estouro
      </div>
      <div className="text-base font-semibold tabular-nums">
        {fixed ? (
          <span className="text-success-ink">Resolvido ✓</span>
        ) : broke ? (
          <span className="text-destructive">
            Estoura em {adjustedDays}d
          </span>
        ) : adjustedDays !== null ? (
          <span className="text-destructive">{adjustedDays}d</span>
        ) : (
          <span className="text-muted-foreground">Sem risco</span>
        )}
      </div>
      {baselineDays !== null && adjustedDays !== null && (
        <p className="text-[11px] text-muted-foreground">
          Antes: {baselineDays}d
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gráfico comparativo
// ---------------------------------------------------------------------------

function ComparisonChart({
  data,
}: {
  data: Array<{ date: string; baseline: number; adjusted: number }>
}) {
  const formatted = data.map((d) => ({
    label: shortBRDate(d.date),
    baseline: d.baseline,
    adjusted: d.adjusted,
    dateIso: d.date,
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={formatted}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
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
          <Tooltip content={<DualTooltip />} />
          <ReferenceLine
            y={0}
            stroke="var(--destructive)"
            strokeOpacity={0.6}
            strokeDasharray="4 2"
          />
          <Legend
            wrapperStyle={{
              fontSize: 11,
              color: "var(--muted-foreground)",
              paddingTop: 8,
            }}
            iconType="line"
            iconSize={14}
            formatter={(value: string) =>
              value === "baseline" ? "Sem ajustes" : "Com ajustes"
            }
          />
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="adjusted"
            stroke="var(--brand)"
            strokeWidth={2.2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function DualTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{
    payload: { dateIso: string; baseline: number; adjusted: number }
  }>
}) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  const delta = d.adjusted - d.baseline

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md min-w-[200px]">
      <p className="text-xs font-medium text-foreground mb-1">
        {longBRDate(d.dateIso)}
      </p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Sem ajustes</span>
          <span className="tabular-nums">{formatBRL(d.baseline)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-brand font-medium">Com ajustes</span>
          <span className="tabular-nums font-semibold">
            {formatBRL(d.adjusted)}
          </span>
        </div>
        {Math.abs(delta) >= 0.01 && (
          <div className="flex justify-between gap-3 pt-1 border-t">
            <span className="text-muted-foreground">Diferença</span>
            <span
              className={cn(
                "tabular-nums font-semibold",
                delta >= 0 ? "text-success-ink" : "text-destructive"
              )}
            >
              {delta >= 0 ? "+" : ""}
              {formatBRL(delta)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isComplete(adj: WhatIfAdjustment): boolean {
  switch (adj.kind) {
    case "add_expense":
    case "add_income":
      return (
        adj.amount > 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(adj.date)
      )
    case "delay_expense":
      return !!adj.transactionId && adj.delayDays > 0
    case "advance_income":
      return !!adj.transactionId && adj.advanceDays > 0
    case "remove_expense":
      return !!adj.transactionId
  }
}

function kindLabel(kind: WhatIfAdjustment["kind"]): string {
  switch (kind) {
    case "add_expense":
      return "Despesa hipotética"
    case "add_income":
      return "Receita hipotética"
    case "delay_expense":
      return "Adiar despesa"
    case "advance_income":
      return "Antecipar receita"
    case "remove_expense":
      return "Cancelar despesa"
  }
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function shortBRDate(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

function formatBRDate(iso: string): string {
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
  return `${WEEKDAYS[date.getUTCDay()]}, ${String(d).padStart(2, "0")}/${String(
    m
  ).padStart(2, "0")}/${y}`
}
