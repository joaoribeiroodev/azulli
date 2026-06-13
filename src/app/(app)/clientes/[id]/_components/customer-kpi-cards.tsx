import { TrendingUp, AlertCircle, Receipt } from "lucide-react"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { formatBRL } from "@/lib/utils/currency"
import type { CustomerDetail } from "@/lib/financial/queries"

export function CustomerKPICards({
  kpis,
}: {
  kpis: CustomerDetail["kpis"]
}) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total recebido</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2 text-success-ink">
            <TrendingUp className="h-5 w-5 text-success" />
            {formatBRL(kpis.totalReceived)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {kpis.transactionCount}{" "}
            {kpis.transactionCount === 1 ? "lançamento" : "lançamentos"} no
            histórico
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Em aberto</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <AlertCircle
              className={`h-5 w-5 ${
                kpis.overdueAmount > 0 ? "text-destructive" : "text-amber-500"
              }`}
            />
            {formatBRL(kpis.pendingAmount)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {kpis.overdueAmount > 0 ? (
            <p className="text-xs text-destructive font-medium">
              {formatBRL(kpis.overdueAmount)} vencido
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma pendência vencida
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Ticket médio</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <Receipt className="h-5 w-5 text-brand" />
            {formatBRL(kpis.averageTicket)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Média das receitas pagas
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
