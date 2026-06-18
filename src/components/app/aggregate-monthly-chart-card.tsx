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

import { fetchAggregateMonthlySeriesAction } from "@/lib/financial/aggregate-actions"
import type { MonthlyBucket } from "@/lib/financial/queries"

type Scope = "customers" | "suppliers" | "products"

type Props = {
  scope: Scope
  initial: MonthlyBucket[]
}

const COPY: Record<Scope, { title: string; desc: string; emptyTitle: string }> =
  {
    customers: {
      title: "Receitas mensais (geral)",
      desc: "Total recebido de todos os clientes",
      emptyTitle: "Sem receitas no período",
    },
    suppliers: {
      title: "Despesas mensais (geral)",
      desc: "Total pago a todos os fornecedores",
      emptyTitle: "Sem despesas no período",
    },
    products: {
      title: "Vendas mensais (geral)",
      desc: "Total faturado em produtos",
      emptyTitle: "Sem vendas no período",
    },
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

export function AggregateMonthlyChartCard({ scope, initial }: Props) {
  const [months, setMonths] = useState<3 | 6 | 12>(6)
  const [data, setData] = useState<MonthlyBucket[]>(initial)
  const [isPending, startTransition] = useTransition()

  useUpdateOnChange(() => {
    startTransition(async () => {
      const series = await fetchAggregateMonthlySeriesAction(scope, months)
      setData(series)
    })
  }, [months, scope])

  const total = data.reduce((sum, d) => sum + d.total, 0)
  const meta = COPY[scope]
  const barColor =
    scope === "customers" ? "var(--success)" : "var(--brand)"

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">{meta.title}</CardTitle>
            <CardDescription>
              {total === 0 ? meta.emptyTitle : `Total: ${formatBRL(total)}`}
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
        <ChartPanel className="h-56">
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
                width={48}
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
