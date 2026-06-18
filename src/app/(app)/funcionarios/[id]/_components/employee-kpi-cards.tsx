import { Wallet, CalendarClock, TrendingDown, AlertCircle } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"
import type { EmployeeDetail } from "@/lib/employees/payroll-queries"

export function EmployeeKPICards({ employee }: { employee: EmployeeDetail }) {
  const { kpis, salary } = employee

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Salário base</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <Wallet className="h-5 w-5 text-brand" />
            {salary ? formatBRL(salary) : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {salary ? "Referência mensal cadastrada" : "Salário não informado"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Pago este mês</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2 text-success-ink">
            <TrendingDown className="h-5 w-5 text-success" />
            {formatBRL(kpis.paidThisMonth)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {salary && salary > 0 ? (
            <p className="text-xs text-muted-foreground">
              {kpis.salaryDeltaThisMonth !== null && kpis.salaryDeltaThisMonth >= 0
                ? `${formatBRL(kpis.salaryDeltaThisMonth)} acima do salário`
                : kpis.salaryDeltaThisMonth !== null
                  ? `${formatBRL(Math.abs(kpis.salaryDeltaThisMonth!))} abaixo do salário`
                  : "Sem comparação"}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Lançamentos com nome na descrição ou categoria de folha
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Pendências</CardDescription>
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
            <p className="text-xs text-muted-foreground">Nada atrasado</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Histórico</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            {kpis.paymentCount}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {kpis.lastPaymentDate
              ? `Último pagamento: ${formatDateBR(kpis.lastPaymentDate)}`
              : "Nenhum pagamento vinculado ainda"}
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
