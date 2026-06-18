"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { formatBRL } from "@/lib/utils/currency"
import { ChartPanel } from "@/components/app/chart-panel"
import type { DailyBucket } from "@/lib/financial/queries"

type Props = {
  data: DailyBucket[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md min-w-[140px]">
      <p className="text-xs font-medium text-foreground mb-1.5">{label}</p>
      {payload.map((p) => (
        <div
          key={p.dataKey}
          className="flex items-center justify-between gap-3 text-xs"
        >
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ background: p.color }}
            />
            {p.dataKey === "income" ? "Entradas" : "Saídas"}
          </span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatBRL(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function WeeklyChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.income + d.expense, 0)

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Sem movimentação paga nos últimos 7 dias
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Os dados aparecem aqui após marcar lançamentos como pagos.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ChartPanel className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
          barCategoryGap="20%"
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--muted-foreground)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--muted-foreground)"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
            width={48}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.3 }}
            content={<CustomTooltip />}
          />
          <Legend
            wrapperStyle={{
              fontSize: 11,
              color: "var(--muted-foreground)",
              paddingTop: 8,
            }}
            iconType="square"
            iconSize={8}
            formatter={(value: string) =>
              value === "income" ? "Entradas" : "Saídas"
            }
          />
          <Bar
            dataKey="income"
            fill="var(--success)"
            radius={[6, 6, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            dataKey="expense"
            fill="var(--destructive)"
            radius={[6, 6, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  )
}
