"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartPanel } from "@/components/app/chart-panel"
import { formatBRL } from "@/lib/utils/currency"
import type { MonthlyPayrollBucket } from "@/lib/employees/payroll-queries"

type Props = {
  employeeName: string
  initial: MonthlyPayrollBucket[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      <p className="tabular-nums font-semibold">{formatBRL(payload[0].value)}</p>
    </div>
  )
}

export function EmployeePayrollChartCard({ employeeName, initial }: Props) {
  const total = initial.reduce((s, b) => s + b.total, 0)
  const hasData = total > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pagamentos registrados</CardTitle>
        <CardDescription>
          Despesas de folha/salário vinculadas a {employeeName} nos últimos 6
          meses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="rounded-lg border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Sem pagamentos detectados no histórico.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Registre uma despesa com o nome do funcionário ou categoria
              &quot;Folha de pagamento&quot;.
            </p>
          </div>
        ) : (
          <ChartPanel className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={initial}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {initial.map((entry) => (
                    <Cell
                      key={entry.yearMonth}
                      fill={
                        entry.total > 0
                          ? "var(--destructive)"
                          : "var(--muted)"
                      }
                      opacity={entry.total > 0 ? 0.85 : 0.35}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        )}
      </CardContent>
    </Card>
  )
}
