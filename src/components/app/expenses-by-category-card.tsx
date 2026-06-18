"use client"

import { useState, useTransition } from "react"
import { PieChart as PieChartIcon, Loader2 } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

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

import {
  fetchExpensesByCategoryAction,
  type CategorySliceData,
} from "@/lib/financial/category-actions"

const COLORS = [
  "var(--brand)",
  "var(--success)",
  "#f59e0b",
  "var(--destructive)",
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#f97316",
]

const OTHERS_COLOR = "var(--muted-foreground)"

function getColor(index: number, category: string): string {
  if (category === "__others") return OTHERS_COLOR
  return COLORS[index % COLORS.length]
}

type TooltipPayload = {
  payload?: CategorySliceData & { fill: string }
  name?: string
  value?: number
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayload[]
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{item.name}</p>
      <p className="text-muted-foreground">{formatBRL(item.value ?? 0)}</p>
    </div>
  )
}

type Props = {
  initial: CategorySliceData[]
}

export function ExpensesByCategoryCard({ initial }: Props) {
  const [range, setRange] = useState<"month" | "last30d">("month")
  const [data, setData] = useState<CategorySliceData[]>(initial)
  const [isPending, startTransition] = useTransition()

  useUpdateOnChange(() => {
    startTransition(async () => {
      const result = await fetchExpensesByCategoryAction(range)
      setData(result)
    })
  }, [range])

  const total = data.reduce((sum, d) => sum + d.total, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-brand" />
              Despesas por categoria
            </CardTitle>
            <CardDescription>
              {total > 0 ? `Total: ${formatBRL(total)}` : "Sem despesas no período"}
            </CardDescription>
          </div>

          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v as "month" | "last30d")}
            size="sm"
            variant="outline"
            className="self-start sm:self-auto shrink-0"
          >
            <ToggleGroupItem value="month" className="text-xs">
              Mês atual
            </ToggleGroupItem>
            <ToggleGroupItem value="last30d" className="text-xs">
              Últimos 30d
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative min-h-[256px]">
          {isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-card/60 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <PieChartIcon className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Nenhuma despesa paga no período 🎉
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4 min-h-[256px]">
              <ChartPanel className="h-48 sm:min-h-[14rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="total"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                    >
                      {data.map((entry, index) => (
                        <Cell
                          key={entry.category}
                          fill={getColor(index, entry.category)}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>

              {/* Legenda */}
              <div className="flex flex-col justify-center gap-1.5 overflow-y-auto max-h-64 sm:max-h-none pr-1">
                {data.map((entry, index) => {
                  const percent = total > 0 ? (entry.total / total) * 100 : 0
                  const color = getColor(index, entry.category)
                  return (
                    <div key={entry.category} className="flex items-center gap-2 text-sm">
                      <span
                        className="shrink-0 h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1 truncate text-foreground">
                        {entry.label}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums text-xs text-muted-foreground">
                        {percent.toFixed(1)}%
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-xs">
                        {formatBRL(entry.total)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
