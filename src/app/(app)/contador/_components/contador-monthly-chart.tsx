"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartPanel } from "@/components/app/chart-panel"
import { formatBRL } from "@/lib/utils/currency"
import type { AccountantMonthlyBucket } from "@/lib/accountant/queries"

type Props = { buckets: AccountantMonthlyBucket[] }

export function ContadorMonthlyChart({ buckets }: Props) {
  const hasData = buckets.some((b) => b.income > 0 || b.expense > 0)

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Evolução mensal</CardTitle>
        <p className="text-xs text-muted-foreground">
          Receitas e despesas pagas — últimos 6 meses
        </p>
      </CardHeader>
      <CardContent>
        <ChartPanel className="h-64">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatBRL(Number(value ?? 0)),
                    name === "income" ? "Receitas" : "Despesas",
                  ]}
                  labelFormatter={(label) => label}
                />
                <Legend
                  formatter={(value) =>
                    value === "income" ? "Receitas" : "Despesas"
                  }
                />
                <Bar
                  dataKey="income"
                  name="income"
                  fill="var(--success)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="expense"
                  name="expense"
                  fill="var(--muted-foreground)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem movimentação nos últimos meses.
            </div>
          )}
        </ChartPanel>
      </CardContent>
    </Card>
  )
}
