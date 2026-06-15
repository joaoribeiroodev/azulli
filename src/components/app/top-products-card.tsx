"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, Trophy, Loader2 } from "lucide-react"

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

import { fetchTopProductsAction } from "@/lib/products/product-actions"
import type { TopProduct } from "@/lib/products/queries"

type Props = {
  initial: TopProduct[]
}

export function TopProductsCard({ initial }: Props) {
  const [range, setRange] = useState<"month" | "last30d">("month")
  const [rows, setRows] = useState<TopProduct[]>(initial)
  const [isPending, startTransition] = useTransition()
  const [firstRender, setFirstRender] = useState(true)

  useEffect(() => {
    if (firstRender) {
      setFirstRender(false)
      return
    }
    startTransition(async () => {
      const data = await fetchTopProductsAction(range)
      setRows(data)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  const total = rows.reduce((sum, r) => sum + r.total, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top 5 produtos
            </CardTitle>
            <CardDescription>Os mais vendidos no período</CardDescription>
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
        {isPending ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Nenhuma venda no período
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Bora vender? 🚀
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, i) => {
              const percent = total > 0 ? (row.total / total) * 100 : 0
              return (
                <li key={row.id}>
                  <Link
                    href={`/produtos/${row.id}`}
                    className="group flex items-center gap-3 py-1.5 rounded-md hover:bg-muted/50 px-2 -mx-2 transition-colors"
                  >
                    <span
                      className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                        i === 0
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-brand transition-colors">
                        {row.name}
                      </p>
                      <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold whitespace-nowrap">
                        {formatBRL(row.total)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {row.units} {row.units === 1 ? "venda" : "vendas"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:block" />
                  </Link>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
