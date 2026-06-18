import { Repeat, Sparkles } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"
import { detectRecurringExpenses } from "@/lib/insights/recurring"

const TOP_N = 5

export async function RecurringExpensesCard() {
  const recurring = await detectRecurringExpenses()

  if (recurring.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat className="h-4 w-4 text-brand" />
                Despesas recorrentes
              </CardTitle>
              <CardDescription>
                Detecta assinaturas e contas fixas dos últimos 6 meses.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-brand-soft text-brand">
              <Sparkles className="h-3 w-3 mr-1" />
              IA
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Ainda não detectamos despesas recorrentes.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              A partir de 3 ocorrências mensais, mostramos aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const top = recurring.slice(0, TOP_N)
  const totalMonthly = recurring.reduce((sum, r) => sum + r.monthlyAmount, 0)
  const staleCount = recurring.filter((r) => r.possiblyCanceled).length
  const moreCount = recurring.length - top.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Repeat className="h-4 w-4 text-brand" />
              Despesas recorrentes
            </CardTitle>
            <CardDescription>
              {recurring.length} cobrança{recurring.length === 1 ? "" : "s"}{" "}
              fixa{recurring.length === 1 ? "" : "s"} detectada
              {recurring.length === 1 ? "" : "s"} ·{" "}
              <strong className="text-foreground">
                {formatBRL(totalMonthly)}
              </strong>
              /mês
              {staleCount > 0 && (
                <>
                  {" · "}
                  <span className="text-warning">
                    {staleCount} possível{staleCount === 1 ? "" : "s"} corte
                  </span>
                </>
              )}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-brand-soft text-brand">
            <Sparkles className="h-3 w-3 mr-1" />
            IA
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.map((r) => (
          <div
            key={r.fingerprint}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 hover:bg-muted/30 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {r.sampleDescription}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                <span>
                  {r.count}× · última em {formatDateBR(r.lastSeen)}
                </span>
                {r.category && (
                  <Badge
                    variant="secondary"
                    className="bg-muted text-foreground hover:bg-muted font-normal text-[10px] py-0"
                  >
                    {r.category}
                  </Badge>
                )}
                {r.possiblyCanceled && (
                  <Badge
                    variant="outline"
                    className="text-warning border-warning/40 font-normal text-[10px] py-0"
                  >
                    Possível corte
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums whitespace-nowrap">
                {formatBRL(r.monthlyAmount)}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                /mês
              </p>
            </div>
          </div>
        ))}

        {moreCount > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{moreCount} cobrança{moreCount === 1 ? "" : "s"} recorrente
            {moreCount === 1 ? "" : "s"} não exibida
            {moreCount === 1 ? "" : "s"}.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
