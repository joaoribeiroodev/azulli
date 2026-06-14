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

import {
  fetchTopCustomersAction,
  fetchTopSuppliersAction,
  type TopPartyData,
} from "@/lib/financial/top-actions"

type Props = {
  kind: "customer" | "supplier"
  initial: TopPartyData[]
}

const COPY = {
  customer: {
    title: "Top 5 clientes",
    desc: "Quem mais te paga no período",
    emptyTitle: "Nenhuma venda paga ainda",
    emptyHint: "Bora vender? 🚀",
    href: (id: string) => `/clientes/${id}`,
  },
  supplier: {
    title: "Top 5 fornecedores",
    desc: "Pra quem você mais paga no período",
    emptyTitle: "Nenhuma despesa paga a fornecedor",
    emptyHint: "Quando pagar uma despesa, aparece aqui.",
    href: (id: string) => `/fornecedores/${id}`,
  },
} as const

export function TopPartiesCard({ kind, initial }: Props) {
  const [range, setRange] = useState<"month" | "last30d">("month")
  const [rows, setRows] = useState<TopPartyData[]>(initial)
  const [isPending, startTransition] = useTransition()
  const [firstRender, setFirstRender] = useState(true)

  useEffect(() => {
    if (firstRender) {
      setFirstRender(false)
      return
    }
    startTransition(async () => {
      const data =
        kind === "customer"
          ? await fetchTopCustomersAction(range)
          : await fetchTopSuppliersAction(range)
      setRows(data)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  const meta = COPY[kind]
  const total = rows.reduce((sum, r) => sum + r.total, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy
                className={`h-4 w-4 ${
                  kind === "customer" ? "text-success-ink" : "text-brand"
                }`}
              />
              {meta.title}
            </CardTitle>
            <CardDescription>{meta.desc}</CardDescription>
          </div>

          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v as "month" | "last30d")}
            size="sm"
            variant="outline"
            className="shrink-0"
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
              {meta.emptyTitle}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {meta.emptyHint}
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, i) => {
              const percent = total > 0 ? (row.total / total) * 100 : 0
              return (
                <li key={row.id}>
                  <Link
                    href={meta.href(row.id)}
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
                          className={
                            kind === "customer"
                              ? "h-full bg-success rounded-full"
                              : "h-full bg-brand rounded-full"
                          }
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-semibold ${
                          kind === "customer"
                            ? "text-success-ink"
                            : "text-foreground"
                        }`}
                      >
                        {formatBRL(row.total)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
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
