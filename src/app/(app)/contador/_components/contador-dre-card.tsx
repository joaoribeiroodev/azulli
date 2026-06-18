import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBRL } from "@/lib/utils/currency"
import {
  getAccountantCategoryBreakdown,
  getAccountantPeriodSummary,
  resolveAccountantRange,
} from "@/lib/accountant/queries"

type Props = { month?: string }

export async function ContadorDreCard({ month }: Props) {
  const range = resolveAccountantRange(month)
  const [summary, categories] = await Promise.all([
    getAccountantPeriodSummary(range.from, range.to),
    getAccountantCategoryBreakdown(range.from, range.to),
  ])

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">DRE simplificado</CardTitle>
        <p className="text-xs text-muted-foreground">
          {range.label} · somente valores pagos
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <DreLine
          label="(+) Receitas"
          value={summary.paidIncome}
          positive
        />
        <div className="space-y-1.5 border-l-2 border-muted pl-3">
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">
              Sem despesas pagas categorizadas no período.
            </p>
          ) : (
            categories.map((c) => (
              <DreLine
                key={c.category}
                label={`(−) ${c.label}`}
                value={c.total}
                sub={`${Math.round(c.share)}% das despesas`}
                negative
                small
              />
            ))
          )}
        </div>
        <DreLine
          label="(−) Total despesas"
          value={summary.paidExpense}
          negative
        />
        <div className="border-t pt-3">
          <DreLine
            label="(=) Resultado do período"
            value={summary.paidProfit}
            highlight
            positive={summary.paidProfit >= 0}
            negative={summary.paidProfit < 0}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function DreLine({
  label,
  value,
  sub,
  positive,
  negative,
  highlight,
  small,
}: {
  label: string
  value: number
  sub?: string
  positive?: boolean
  negative?: boolean
  highlight?: boolean
  small?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p
          className={`${small ? "text-xs" : "text-sm"} ${
            highlight ? "font-semibold" : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
        {sub && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
        )}
      </div>
      <p
        className={`font-semibold tabular-nums shrink-0 ${
          highlight ? "text-base font-display" : small ? "text-sm" : ""
        } ${
          positive && value > 0
            ? "text-success-ink"
            : negative && value > 0
              ? "text-foreground"
              : highlight && value < 0
                ? "text-destructive"
                : ""
        }`}
      >
        {formatBRL(value)}
      </p>
    </div>
  )
}
