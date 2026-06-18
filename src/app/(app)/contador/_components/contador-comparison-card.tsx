import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBRL } from "@/lib/utils/currency"
import {
  getAccountantPeriodComparison,
  resolveAccountantRange,
} from "@/lib/accountant/queries"

type Props = { month?: string }

function pctLabel(value: number | null): string | null {
  if (value === null) return null
  const rounded = Math.round(value)
  if (rounded === 0) return "igual ao mês anterior"
  const sign = rounded > 0 ? "+" : ""
  return `${sign}${rounded}% vs mês anterior`
}

export async function ContadorComparisonCard({ month }: Props) {
  const cmp = await getAccountantPeriodComparison(month)
  const range = resolveAccountantRange(month)

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Comparativo — {cmp.currentLabel}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pagos no período · comparado com {cmp.previousLabel}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Metric
            label="Receitas pagas"
            value={cmp.current.income}
            delta={cmp.deltaIncome}
            goodWhenUp
          />
          <Metric
            label="Despesas pagas"
            value={cmp.current.expense}
            delta={cmp.deltaExpense}
            goodWhenUp={false}
          />
          <Metric
            label="Resultado"
            value={cmp.current.profit}
            delta={
              cmp.previous.profit !== 0
                ? ((cmp.deltaProfit / Math.abs(cmp.previous.profit)) * 100)
                : null
            }
            goodWhenUp
            isProfit
          />
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t pt-3">
          <span>
            {cmp.current.transactionCount} lançamento
            {cmp.current.transactionCount === 1 ? "" : "s"} no período
          </span>
          {cmp.current.ofxImportCount > 0 && (
            <span>
              {cmp.current.ofxImportCount} via importação OFX
            </span>
          )}
          <span>
            Período: {range.from} a {range.to}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function Metric({
  label,
  value,
  delta,
  goodWhenUp,
  isProfit,
}: {
  label: string
  value: number
  delta: number | null
  goodWhenUp: boolean
  isProfit?: boolean
}) {
  const deltaText = pctLabel(delta)
  const deltaUp = delta !== null && delta > 0
  const deltaDown = delta !== null && delta < 0
  const isGood =
    delta === null || delta === 0
      ? true
      : goodWhenUp
        ? deltaUp
        : deltaDown

  const Icon =
    deltaUp ? ArrowUpRight : deltaDown ? ArrowDownRight : Minus

  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-xl font-display font-bold mt-1 ${
          isProfit && value < 0 ? "text-destructive" : isProfit ? "text-success-ink" : ""
        }`}
      >
        {formatBRL(value)}
      </p>
      {deltaText && (
        <p
          className={`text-xs mt-1 flex items-center gap-1 ${
            isGood ? "text-muted-foreground" : "text-destructive"
          }`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {deltaText}
        </p>
      )}
    </div>
  )
}
