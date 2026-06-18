import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatBRL } from "@/lib/utils/currency"
import {
  getAccountantPeriodSummary,
  resolveAccountantRange,
} from "@/lib/accountant/queries"

type Props = { month?: string }

export async function ContadorSummaryCards({ month }: Props) {
  const range = resolveAccountantRange(month)
  const s = await getAccountantPeriodSummary(range.from, range.to)

  return (
    <section className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Resumo de <strong className="text-foreground">{range.label}</strong>{" "}
        (valores pagos no período)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Entradas pagas</CardDescription>
            <CardTitle className="text-2xl font-display text-success-ink">
              {formatBRL(s.income)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saídas pagas</CardDescription>
            <CardTitle className="text-2xl font-display">
              {formatBRL(s.expense)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resultado (pagos)</CardDescription>
            <CardTitle
              className={`text-2xl font-display ${
                s.profit >= 0 ? "text-success-ink" : "text-destructive"
              }`}
            >
              {formatBRL(s.profit)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendências (geral)</CardDescription>
            <CardTitle className="text-2xl font-display">
              {formatBRL(s.pendingAmount)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground space-y-0.5">
            <p>
              {s.overdueCount > 0
                ? `${s.overdueCount} vencida(s)`
                : "Sem vencidos"}
            </p>
            {s.overdueReceivable > 0 && (
              <p>A receber vencido: {formatBRL(s.overdueReceivable)}</p>
            )}
            {s.overduePayable > 0 && (
              <p>A pagar vencido: {formatBRL(s.overduePayable)}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
