"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts"
import { formatBRL } from "@/lib/utils/currency"
import type { DailyBucket } from "@/lib/financial/queries"

type Props = { data: DailyBucket[] }

export function WeeklyChart({ data }: Props) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            className="text-xs"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            className="text-xs"
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.3 }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
            formatter={(value: number) => formatBRL(value)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            name="Entradas"
            dataKey="income"
            fill="var(--color-success)"
            radius={[6, 6, 0, 0]}
          />
          <Bar
            name="Saídas"
            dataKey="expense"
            fill="var(--color-destructive)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}