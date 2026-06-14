import { TrendingDown, AlertCircle, Receipt } from "lucide-react"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { formatBRL } from "@/lib/utils/currency"
import type { SupplierDetail } from "@/lib/financial/queries"

export function SupplierKPICards({
  kpis,
}: {
  kpis: SupplierDetail["kpis"]
}) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total pago</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-destructive" />
            {formatBRL(kpis.totalPaid)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {kpis.transactionCount}{" "}
            {kpis.transactionCount === 1 ? "despesa" : "despesas"} no histórico
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>A pagar</CardDescription>
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
              Nenhum pagamento atrasado
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
            Média das despesas pagas
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
