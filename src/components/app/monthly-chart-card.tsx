"use client"

import { useState, useTransition } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Loader2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { formatBRL } from "@/lib/utils/currency"
import { ChartPanel } from "@/components/app/chart-panel"
import { useUpdateOnChange } from "@/hooks/use-update-on-change"

import { fetchMonthlySeriesAction } from "@/lib/financial/monthly-actions"
import type { MonthlyBucket } from "@/lib/financial/queries"

type Props = {
  partyId: string
  partyType: "customer" | "supplier"
  initial: MonthlyBucket[]
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
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0]?.value ?? 0
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">
        {formatBRL(value)}
      </p>
    </div>
  )
}

export function MonthlyChartCard({ partyId, partyType, initial }: Props) {
  const [months, setMonths] = useState<3 | 6 | 12>(6)
  const [data, setData] = useState<MonthlyBucket[]>(initial)
  const [isPending, startTransition] = useTransition()

  useUpdateOnChange(() => {
    startTransition(async () => {
      const series = await fetchMonthlySeriesAction(partyId, partyType, months)
      setData(series)
    })
  }, [months, partyId, partyType])

  const total = data.reduce((sum, d) => sum + d.total, 0)
  const isCustomer = partyType === "customer"
  const barColor = isCustomer ? "var(--success)" : "var(--brand)"
  const allZero = total === 0

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {isCustomer ? "Receitas por mês" : "Despesas por mês"}
            </CardTitle>
            <CardDescription>
              {allZero
                ? "Sem movimentação no período"
                : `Total: ${formatBRL(total)}`}
            </CardDescription>
          </div>

          <ToggleGroup
            type="single"
            value={String(months)}
            onValueChange={(v) =>
              v && setMonths(parseInt(v, 10) as 3 | 6 | 12)
            }
            size="sm"
            variant="outline"
            className="self-start sm:self-auto shrink-0"
          >
            <ToggleGroupItem value="3" className="text-xs">
              3m
            </ToggleGroupItem>
            <ToggleGroupItem value="6" className="text-xs">
              6m
            </ToggleGroupItem>
            <ToggleGroupItem value="12" className="text-xs">
              12m
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        <ChartPanel className="h-48">
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-sm z-10 rounded-md">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
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
                width={40}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                content={<CustomTooltip />}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={barColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </CardContent>
    </Card>
  )
}
